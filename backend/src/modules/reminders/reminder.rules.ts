import { AppError } from "../../shared/types/errors";

// Payment reminder levels (Paramètres > Rappels): the 1st reminder, the 2nd
// and the formal notice ("mise en demeure"). Pure - no I/O - tested in
// reminder.rules.test.ts.

export const REMINDER_LEVELS = [1, 2, 3] as const;
export type ReminderLevel = typeof REMINDER_LEVELS[number];

export interface ReminderLevelSettings {
  level: ReminderLevel;
  // The 1st reminder is always on - a company that never reminds just
  // doesn't send it.
  enabled: boolean;
  // Days after the previous reminder was sent - the 1st one's after the
  // invoice's due date.
  delay_days: number;
  // CHF, 0 for none - added to the reminder's QR-bill, never to the invoice.
  fee: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderLevelSettings[] = [
  { level: 1, enabled: true, delay_days: 10, fee: 0 },
  { level: 2, enabled: true, delay_days: 14, fee: 0 },
  { level: 3, enabled: true, delay_days: 14, fee: 0 },
];

// At least a day: a reminder never goes out the day the invoice falls due
// (it isn't overdue yet), nor the same day as the one before it.
const MIN_DELAY_DAYS = 1;
const MAX_DELAY_DAYS = 365;
const MAX_FEE = 10_000;

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * The three levels as stored: in order, the 1st always enabled, a delay of
 * 1-365 whole days, a fee of 0-10'000 CHF to the cent. A level left out
 * keeps its default. Anything else is a 400.
 */
export const normalizeReminderSettings = (input: unknown): ReminderLevelSettings[] => {
  if (!Array.isArray(input)) {
    throw new AppError("levels must be a list", 400);
  }
  return DEFAULT_REMINDER_SETTINGS.map(defaults => {
    const sent = input.find(item => item && typeof item === "object" && (item as { level?: unknown }).level === defaults.level) as
      Partial<Record<keyof ReminderLevelSettings, unknown>> | undefined;
    if (!sent) {
      return defaults;
    }
    const delay = sent.delay_days === undefined ? defaults.delay_days : Number(sent.delay_days);
    if (!Number.isInteger(delay) || delay < MIN_DELAY_DAYS || delay > MAX_DELAY_DAYS) {
      throw new AppError(`delay_days must be a whole number of days between ${MIN_DELAY_DAYS} and ${MAX_DELAY_DAYS}`, 400);
    }
    const fee = sent.fee === undefined || sent.fee === null || sent.fee === "" ? 0 : Number(sent.fee);
    if (!Number.isFinite(fee) || fee < 0 || fee > MAX_FEE) {
      throw new AppError(`fee must be between 0 and ${MAX_FEE}`, 400);
    }
    return {
      level: defaults.level,
      enabled: defaults.level === 1 ? true : sent.enabled !== false,
      delay_days: delay,
      fee: round2(fee),
    };
  });
};

/** What's stored, read back - the defaults when there's nothing or it can't be read (never a failed page). */
export const reminderSettingsOf = (stored: unknown): ReminderLevelSettings[] => {
  if (stored === null || stored === undefined) {
    return DEFAULT_REMINDER_SETTINGS;
  }
  try {
    // A delay of 0 was allowed before the minimum of a day: read as a day.
    const levels = Array.isArray(stored)
      ? stored.map(item => item && typeof item === "object" && Number((item as { delay_days?: unknown }).delay_days) === 0
        ? { ...item, delay_days: MIN_DELAY_DAYS } : item)
      : stored;
    return normalizeReminderSettings(levels);
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
};

/** A reminder already sent - its level and the day it went out. */
export interface SentReminder {
  level: number;
  date: Date | string;
  total_fees: number | string;
}

export interface NextReminder {
  level: ReminderLevel;
  // The day it's due: its delay after the previous one (the due date for
  // the 1st) - it can go out earlier, the dashboard lists it from then.
  due_on: string;
  fee: number;
  // Its fee and the earlier reminders' - what its QR-bill adds.
  total_fees: number;
}

// Dates as plain YYYY-MM-DD, in local time - a reminder is about days, never hours.
export const toDateOnly = (value: Date | string): string => {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const addDays = (date: string, days: number): string => {
  const [year, month, day] = date.split("-").map(Number);
  return toDateOnly(new Date(year, month - 1, day + days));
};

/**
 * The next reminder of an invoice due on `dueDate`: the first enabled level
 * past the highest one sent, its delay counted from that one's date (the due
 * date for the 1st). Null when every enabled level was sent, or without a
 * due date to count from.
 */
export const nextReminderOf = (
  dueDate: Date | string | null,
  sent: SentReminder[],
  settings: ReminderLevelSettings[]
): NextReminder | null => {
  const last = [...sent].sort((a, b) => b.level - a.level)[0];
  const next = settings.find(level => level.enabled && level.level > (last?.level ?? 0));
  const from = last ? last.date : dueDate;
  if (!next || from === null) {
    return null;
  }
  return {
    level: next.level,
    due_on: addDays(toDateOnly(from), next.delay_days),
    fee: next.fee,
    total_fees: round2(Number(last?.total_fees ?? 0) + next.fee),
  };
};

/** Whether a reminder due on `dueOn` is due by `today`. */
export const isDueBy = (dueOn: string, today: Date | string): boolean => dueOn <= toDateOnly(today);
