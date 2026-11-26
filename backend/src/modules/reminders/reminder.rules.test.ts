import { describe, expect, it } from "vitest";
import { DEFAULT_REMINDER_SETTINGS, isDueBy, nextReminderOf, normalizeReminderSettings, reminderSettingsOf, toDateOnly } from "./reminder.rules";

const settings = normalizeReminderSettings([
  { level: 1, delay_days: 10, fee: 0 },
  { level: 2, delay_days: 14, fee: 20 },
  { level: 3, delay_days: 7, fee: 30 },
]);

describe("normalizeReminderSettings", () => {
  it("keeps the three levels in order, a level left out its default", () => {
    expect(normalizeReminderSettings([{ level: 2, delay_days: "20", fee: "15.555" }])).toEqual([
      DEFAULT_REMINDER_SETTINGS[0],
      { level: 2, enabled: true, delay_days: 20, fee: 15.56 },
      DEFAULT_REMINDER_SETTINGS[2],
    ]);
  });

  it("never turns the 1st reminder off, the others can be", () => {
    const levels = normalizeReminderSettings([{ level: 1, enabled: false }, { level: 3, enabled: false }]);
    expect(levels.map(level => level.enabled)).toEqual([true, true, false]);
  });

  it("refuses a delay or a fee out of bounds, or no list", () => {
    expect(() => normalizeReminderSettings([{ level: 1, delay_days: 1.5 }])).toThrow();
    expect(() => normalizeReminderSettings([{ level: 1, delay_days: -1 }])).toThrow();
    // Never the due date itself, nor the same day as the previous reminder.
    expect(() => normalizeReminderSettings([{ level: 1, delay_days: 0 }])).toThrow();
    expect(() => normalizeReminderSettings([{ level: 2, delay_days: 0 }])).toThrow();
    expect(() => normalizeReminderSettings([{ level: 2, fee: -5 }])).toThrow();
    expect(() => normalizeReminderSettings([{ level: 2, fee: "abc" }])).toThrow();
    expect(() => normalizeReminderSettings({ level: 1 })).toThrow();
  });

  it("reads what can't be read back as the defaults", () => {
    expect(reminderSettingsOf(null)).toEqual(DEFAULT_REMINDER_SETTINGS);
    expect(reminderSettingsOf("broken")).toEqual(DEFAULT_REMINDER_SETTINGS);
  });

  it("reads a delay of 0 stored before the one-day minimum as a day, the rest kept", () => {
    expect(reminderSettingsOf([{ level: 1, enabled: true, delay_days: 0, fee: 5 }, { level: 2, enabled: false, delay_days: 0, fee: 0 }]))
      .toEqual([
        { level: 1, enabled: true, delay_days: 1, fee: 5 },
        { level: 2, enabled: false, delay_days: 1, fee: 0 },
        DEFAULT_REMINDER_SETTINGS[2],
      ]);
  });
});

describe("nextReminderOf", () => {
  it("is the 1st reminder, its delay after the due date", () => {
    expect(nextReminderOf("2026-11-01", [], settings)).toEqual({ level: 1, due_on: "2026-11-11", fee: 0, total_fees: 0 });
  });

  it("counts the next level from the day the previous one was sent, adding up the fees", () => {
    const sent = [{ level: 1, date: "2026-11-20", total_fees: 0 }, { level: 2, date: "2026-12-10", total_fees: "20.00" }];
    expect(nextReminderOf("2026-11-01", sent.slice(0, 1), settings)).toEqual({ level: 2, due_on: "2026-12-04", fee: 20, total_fees: 20 });
    expect(nextReminderOf("2026-11-01", sent, settings)).toEqual({ level: 3, due_on: "2026-12-17", fee: 30, total_fees: 50 });
  });

  it("skips a level turned off, and has nothing left after the last", () => {
    const withoutSecond = normalizeReminderSettings([{ level: 2, enabled: false }]);
    expect(nextReminderOf("2026-11-01", [{ level: 1, date: "2026-11-15", total_fees: 0 }], withoutSecond)?.level).toBe(3);
    expect(nextReminderOf("2026-11-01", [{ level: 3, date: "2026-12-01", total_fees: 50 }], settings)).toBeNull();
  });

  it("has nothing to count from without a due date or a reminder sent", () => {
    expect(nextReminderOf(null, [], settings)).toBeNull();
  });

  it("goes across the end of a month and a year", () => {
    expect(nextReminderOf("2026-12-25", [], settings)?.due_on).toBe("2027-01-04");
  });
});

describe("isDueBy", () => {
  it("is due on its day and after, not before", () => {
    expect(isDueBy("2026-11-24", new Date(2026, 10, 24, 18))).toBe(true);
    expect(isDueBy("2026-11-24", "2026-11-25")).toBe(true);
    expect(isDueBy("2026-11-24", "2026-11-23")).toBe(false);
  });

  it("reads a date in local time", () => {
    expect(toDateOnly(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});
