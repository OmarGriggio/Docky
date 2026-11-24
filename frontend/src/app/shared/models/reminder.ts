// Payment reminders - see the backend's modules/reminders.

export type ReminderLevel = 1 | 2 | 3;

/** One level of Paramètres > Rappels: the 1st reminder, the 2nd, the formal notice. */
export interface ReminderLevelSettings {
  level: ReminderLevel;
  // The 1st is always on.
  enabled: boolean;
  // Days after the previous reminder was sent - the 1st's after the due date.
  delay_days: number;
  // CHF, 0 for none - added to the reminder's QR-bill.
  fee: number;
}

/** A reminder sent for an invoice. */
export interface InvoiceReminder {
  id: number;
  document_id: number;
  level: ReminderLevel;
  // YYYY-MM-DD.
  date: string;
  fee: number;
  total_fees: number;
  amount_due: number;
}

/** An invoice's next reminder: its level, the day it's due, its fees. */
export interface NextReminder {
  level: ReminderLevel;
  due_on: string;
  fee: number;
  total_fees: number;
}

export interface InvoiceReminders {
  reminders: InvoiceReminder[];
  next: NextReminder | null;
  amount_due: number;
}

/** A row of the dashboard's "Factures à relancer". */
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
  last_level: ReminderLevel | null;
  last_date: string | null;
  next: NextReminder;
}

// Each level's name (reminders.levels.*): "1er rappel", "2e rappel", "Mise en demeure".
export const reminderLevelKey = (level: ReminderLevel): string => `reminders.levels.${level}`;
