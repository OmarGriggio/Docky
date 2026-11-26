import { withTransaction } from "../../shared/config/database";
import { AppError, NotFoundError } from "../../shared/types/errors";
import { getDocumentByIdForUpdateFromDB, getDocumentByIdFromDB } from "../documents/document.repository";
import { getDepositDeductionsServ } from "../documents/document.service";
import { amountDue } from "../documents/deposit";
import { buildBilledAddress } from "../documents/billed-address";
import { Document } from "../documents/document.types";
import { getClientByIdServ } from "../clients/client.service";
import { reminderTextOf, templateOfDocumentServ } from "../templates/template.service";
import { toPdfLanguage } from "../../pdf/templates/pdf-labels";
import { ReminderToPrint } from "../../pdf/templates/reminder.types";
import {
  isDueBy, nextReminderOf, normalizeReminderSettings, NextReminder, ReminderLevel, ReminderLevelSettings, reminderSettingsOf, toDateOnly,
} from "./reminder.rules";
import {
  createReminderInDB, deleteReminderInDB, getReminderByIdFromDB, getReminderSettingsFromDB, getRemindableInvoicesFromDB,
  getRemindersOfDocumentFromDB, upsertReminderSettingsInDB,
} from "./reminder.repository";
import { InvoiceReminder, InvoiceReminders, InvoiceToRemind } from "./reminder.types";

// Payment reminders (Paramètres > Rappels for the levels, each invoice's
// "Rappels" for the reminders themselves): which one is next and when, sending
// it - recorded with what it asks, so it prints again the same - and taking
// the latest back.

const asLocalDate = (date: string): Date => {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const getReminderSettingsServ = async (company_id: number): Promise<ReminderLevelSettings[]> =>
  reminderSettingsOf(await getReminderSettingsFromDB(company_id));

export const updateReminderSettingsServ = async (company_id: number, input: unknown): Promise<ReminderLevelSettings[]> => {
  const levels = normalizeReminderSettings((input as { levels?: unknown } | null)?.levels);
  await upsertReminderSettingsInDB(company_id, levels);
  return levels;
};

// An invoice of this company - a 404 for anything else, like any id.
const invoiceOf = (document: Document | null): Document => {
  if (!document || document.type !== "INVOICE") {
    throw new NotFoundError("Invoice not found");
  }
  return document;
};

const balanceOf = async (document: Document, company_id: number): Promise<number> =>
  amountDue(document.amount_incl_vat, await getDepositDeductionsServ(document, company_id));

// Only a sent invoice with something left to pay gets reminded.
const nextOf = (document: Document, balance: number, reminders: InvoiceReminder[], settings: ReminderLevelSettings[]): NextReminder | null =>
  document.status === "SENT" && balance > 0 ? nextReminderOf(document.due_date, reminders, settings) : null;

/** An invoice's reminders so far and its next one. */
export const getInvoiceRemindersServ = async (documentId: number, company_id: number): Promise<InvoiceReminders> => {
  const document = invoiceOf(await getDocumentByIdFromDB(documentId, company_id));
  const reminders = await getRemindersOfDocumentFromDB(document.id, company_id);
  const balance = await balanceOf(document, company_id);
  return {
    document_id: document.id,
    status: document.status,
    reminders,
    next: nextOf(document, balance, reminders, await getReminderSettingsServ(company_id)),
    amount_due: balance,
  };
};

/**
 * Sends the invoice's next reminder (its level is never taken from the
 * request): recorded with today's date, its fee, what the invoice still asks
 * for, its template's text of that level and the client's address - under
 * the invoice's lock, so two clicks never send the same level twice. Only a
 * sent invoice past its due date, with something left to pay and a level
 * left to send, once that level is due (its delay after the previous one) -
 * a 409 with its code otherwise.
 */
export const sendReminderServ = async (documentId: number, company_id: number, today = new Date()): Promise<InvoiceReminder> =>
  withTransaction(async () => {
    const document = invoiceOf(await getDocumentByIdForUpdateFromDB(documentId, company_id));
    if (document.status !== "SENT") {
      throw new AppError("Only a sent, unpaid invoice can be reminded", 409, "REMINDER_INVOICE_NOT_SENT");
    }
    if (!document.due_date || toDateOnly(document.due_date) >= toDateOnly(today)) {
      throw new AppError("The invoice isn't overdue yet", 409, "REMINDER_NOT_OVERDUE");
    }
    const balance = await balanceOf(document, company_id);
    const reminders = await getRemindersOfDocumentFromDB(document.id, company_id);
    const next = nextOf(document, balance, reminders, await getReminderSettingsServ(company_id));
    if (!next) {
      throw new AppError("No reminder left to send for this invoice", 409, "REMINDER_NONE_LEFT");
    }
    // Its delay is the company's rule - and a double click never sends two levels at once.
    if (!isDueBy(next.due_on, today)) {
      throw new AppError("This reminder isn't due yet", 409, "REMINDER_NOT_DUE");
    }

    const client = await getClientByIdServ(document.client_id, company_id);
    const template = await templateOfDocumentServ(document.template_id, company_id);
    return createReminderInDB({
      company_id,
      document_id: document.id,
      level: next.level,
      date: toDateOnly(today),
      fee: next.fee,
      total_fees: next.total_fees,
      amount_due: balance,
      text: reminderTextOf(template, toPdfLanguage(client.language), next.level),
      billed_address: buildBilledAddress(client, document),
    });
  });

/**
 * Takes a reminder back (sent by mistake) - only the latest of its invoice,
 * so the levels stay in order, and only while the invoice is still SENT: once
 * paid or cancelled, the reminders it got are its history (a formal notice
 * sent counts in a debt collection).
 */
export const deleteReminderServ = async (id: number, company_id: number): Promise<void> =>
  withTransaction(async () => {
    const reminder = await getReminderByIdFromDB(id, company_id);
    if (!reminder) {
      throw new NotFoundError("Reminder not found");
    }
    const document = await getDocumentByIdForUpdateFromDB(reminder.document_id, company_id);
    if (document?.status !== "SENT") {
      throw new AppError("A reminder can only be taken back while its invoice is still sent", 409, "REMINDER_INVOICE_CLOSED");
    }
    const latest = (await getRemindersOfDocumentFromDB(reminder.document_id, company_id)).at(-1);
    if (latest?.id !== reminder.id) {
      throw new AppError("Only the latest reminder of an invoice can be taken back", 409, "REMINDER_NOT_LATEST");
    }
    await deleteReminderInDB(id, company_id);
  });

/** The invoices whose next reminder is due by `today` - the dashboard's "Factures à relancer", the longest overdue first. */
export const getInvoicesToRemindServ = async (company_id: number, today = new Date()): Promise<InvoiceToRemind[]> => {
  const settings = await getReminderSettingsServ(company_id);
  const rows = await getRemindableInvoicesFromDB(company_id);
  return rows.flatMap(row => {
    const reminders = row.reminders as { level: ReminderLevel; date: string; total_fees: number }[];
    const balance = Number(row.amount_due);
    const next = balance > 0 ? nextReminderOf(row.due_date, reminders, settings) : null;
    if (!next || !isDueBy(next.due_on, today)) {
      return [];
    }
    const { reminders: _, ...invoice } = row;
    const last = reminders.at(-1);
    return [{ ...invoice, amount_due: balance, last_level: last?.level ?? null, last_date: last?.date ?? null, next }];
  });
};

/**
 * What a reminder PDF prints: the reminder of that `level` already sent, as
 * it went out - or, without a level, the next one as it would go out today
 * (its template's text, the client's current address); an invoice with no
 * level left previews its last one again.
 */
export const reminderToPrintServ = async (documentId: number, company_id: number, level?: number): Promise<ReminderToPrint> => {
  const document = invoiceOf(await getDocumentByIdFromDB(documentId, company_id));
  const reminders = await getRemindersOfDocumentFromDB(document.id, company_id);

  if (level !== undefined) {
    const sent = reminders.find(reminder => reminder.level === level);
    if (!sent) {
      throw new NotFoundError("Reminder not found");
    }
    return {
      level: sent.level, date: asLocalDate(sent.date), text: sent.text, fee: Number(sent.fee), totalFees: Number(sent.total_fees),
      amountDue: Number(sent.amount_due), billedAddress: sent.billed_address,
    };
  }

  const settings = await getReminderSettingsServ(company_id);
  const balance = await balanceOf(document, company_id);
  const next = nextOf(document, balance, reminders, settings);
  const last = reminders.at(-1);
  if (!next && last) {
    return reminderToPrintServ(documentId, company_id, last.level);
  }
  const client = await getClientByIdServ(document.client_id, company_id);
  const template = await templateOfDocumentServ(document.template_id, company_id);
  const nextLevel = next?.level ?? 1;
  return {
    level: nextLevel,
    date: new Date(),
    text: reminderTextOf(template, toPdfLanguage(client.language), nextLevel),
    fee: next?.fee ?? 0,
    totalFees: next?.total_fees ?? 0,
  };
};
