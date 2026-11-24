-- A company's payment reminder levels, set by its admin on Paramètres >
-- Rappels (backend/src/modules/reminders). One row per company at most -
-- none: reminder.rules.ts's DEFAULT_REMINDER_SETTINGS.
--
-- levels: [{ "level": 1 | 2 | 3, "enabled": bool, "delay_days": int,
-- "fee": number }] - the 1st reminder, the 2nd and the formal notice, each
-- due `delay_days` after the previous one was sent (the 1st after the
-- invoice's due date), with its own fee (CHF, 0 for none). Checked and
-- completed by reminder.rules.ts's normalizeReminderSettings before it's
-- stored.

CREATE TABLE IF NOT EXISTS reminder_settings (
    company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    levels JSONB NOT NULL
);
