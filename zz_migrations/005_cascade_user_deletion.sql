-- Deleting a user (DELETE /user/:id) used to fail with a foreign-key error
-- for anyone who had ever logged in: refresh_tokens and login_history both
-- referenced users(id) with no ON DELETE rule. A removed employee could
-- therefore never actually be removed.
--
-- refresh_tokens: the user's sessions go with them (CASCADE).
-- login_history: an audit trail, kept - the row stays with its email, just
-- no longer linked to a user that doesn't exist (SET NULL, user_id is
-- already nullable for failed logins on unknown emails).
--
-- Drop-then-add so it's harmless to re-run by hand.

ALTER TABLE refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE login_history DROP CONSTRAINT IF EXISTS login_history_user_id_fkey;
ALTER TABLE login_history
    ADD CONSTRAINT login_history_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
