import { BilledAddress } from "../documents/document.types";
import { NextReminder, ReminderLevel } from "./reminder.rules";

/** A reminder sent for an invoice (invoice_reminders - 035_add_invoice_reminders.sql). */
export interface InvoiceReminder {
  id: number;
  company_id: number;
  document_id: number;
  level: ReminderLevel;
  // YYYY-MM-DD.
  date: string;
  fee: number;
  total_fees: number;
  amount_due: number;
  text: string;
  billed_address: BilledAddress | null;
}

export type NewInvoiceReminder = Omit<InvoiceReminder, "id">;

/** An invoice's reminders so far and its next one - what the "Rappels" dialog shows. */
export interface InvoiceReminders {
  reminders: InvoiceReminder[];
  // Null once every level was sent, or while the invoice can't be reminded
  // (not sent, nothing left to pay, not due yet for the 1st).
  next: NextReminder | null;
  // What the invoice still asks for (incl. VAT, deposits deducted).
  amount_due: number;
}

/** An invoice the dashboard's "Factures à relancer" lists: its next reminder is due. */
export interface InvoiceToRemind {
  id: number;
  number: string;
  due_date: string | null;
  amount_due: number;
  recipient_name: string | null;
  client_id: number;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  is_placeholder: boolean;
  // The highest level sent so far and when (null: none yet).
  last_level: ReminderLevel | null;
  last_date: string | null;
  next: NextReminder;
}
