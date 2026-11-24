import { db } from "../../shared/config/database";
import { InvoiceReminder, NewInvoiceReminder } from "./reminder.types";

// Dates as plain YYYY-MM-DD - pg would turn a DATE into a local midnight that
// JSON then shifts to the day before in UTC.
const REMINDER_COLUMNS = `id, company_id, document_id, level, to_char(date, 'YYYY-MM-DD') AS date, fee, total_fees,
  amount_due, text, billed_address`;

export const getReminderSettingsFromDB = async (company_id: number): Promise<unknown | null> => {
  const result = await db().query("SELECT levels FROM reminder_settings WHERE company_id = $1", [company_id]);
  return result.rows[0]?.levels ?? null;
};

export const upsertReminderSettingsInDB = async (company_id: number, levels: unknown): Promise<void> => {
  await db().query(
    `INSERT INTO reminder_settings (company_id, levels) VALUES ($1, $2)
     ON CONFLICT (company_id) DO UPDATE SET levels = EXCLUDED.levels`,
    [company_id, JSON.stringify(levels)]
  );
};

/** An invoice's reminders, the 1st first. */
export const getRemindersOfDocumentFromDB = async (document_id: number, company_id: number): Promise<InvoiceReminder[]> => {
  const result = await db().query(
    `SELECT ${REMINDER_COLUMNS} FROM invoice_reminders WHERE document_id = $1 AND company_id = $2 ORDER BY level`,
    [document_id, company_id]
  );
  return result.rows;
};

export const getReminderByIdFromDB = async (id: number, company_id: number): Promise<InvoiceReminder | null> => {
  const result = await db().query(`SELECT ${REMINDER_COLUMNS} FROM invoice_reminders WHERE id = $1 AND company_id = $2`, [id, company_id]);
  return result.rows[0] ?? null;
};

export const createReminderInDB = async (reminder: NewInvoiceReminder): Promise<InvoiceReminder> => {
  const result = await db().query(
    `INSERT INTO invoice_reminders (company_id, document_id, level, date, fee, total_fees, amount_due, text, billed_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING ${REMINDER_COLUMNS}`,
    [reminder.company_id, reminder.document_id, reminder.level, reminder.date, reminder.fee, reminder.total_fees,
      reminder.amount_due, reminder.text, reminder.billed_address === null ? null : JSON.stringify(reminder.billed_address)]
  );
  return result.rows[0];
};

export const deleteReminderInDB = async (id: number, company_id: number): Promise<void> => {
  await db().query("DELETE FROM invoice_reminders WHERE id = $1 AND company_id = $2", [id, company_id]);
};

/**
 * Every invoice that could get a reminder: sent, not paid (status SENT -
 * archived ones included, the client still owes them, like the dashboard's
 * open invoices), with a due date - its balance (frozen deposits deducted)
 * and its reminders so far. Which of them is due is worked out from the
 * company's levels (reminder.rules.ts).
 */
export const getRemindableInvoicesFromDB = async (company_id: number) => {
  const result = await db().query(
    `SELECT d.id, d.number, to_char(d.due_date, 'YYYY-MM-DD') AS due_date, d.recipient_name,
            (d.amount_incl_vat - COALESCE((SELECT SUM((deduction->>'amount_incl_vat')::numeric)
              FROM jsonb_array_elements(d.deposit_deductions) deduction), 0)) AS amount_due,
            c.id AS client_id, c.company_name, c.first_name, c.last_name, c.is_placeholder,
            COALESCE((SELECT json_agg(json_build_object('level', r.level, 'date', to_char(r.date, 'YYYY-MM-DD'), 'total_fees', r.total_fees) ORDER BY r.level)
              FROM invoice_reminders r WHERE r.document_id = d.id AND r.company_id = d.company_id), '[]') AS reminders
     FROM documents d
     JOIN clients c ON c.id = d.client_id AND c.company_id = d.company_id
     WHERE d.company_id = $1 AND d.type = 'INVOICE' AND d.status = 'SENT' AND d.due_date IS NOT NULL
     ORDER BY d.due_date, d.id`,
    [company_id]
  );
  return result.rows;
};
