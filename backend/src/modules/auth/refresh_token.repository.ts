import crypto from "crypto";
import { db } from "../../shared/config/database";

// We only ever store a hash of the refresh token, never the raw value - a
// database leak alone shouldn't hand out valid tokens (same idea as
// password_hash on users).
export const hashToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

// Every still-valid session of one user - when the account is deleted or
// deactivated, none of its refresh tokens may keep minting access tokens.
export const revokeAllRefreshTokensOfUserInDB = async (user_id: number) => {
  await db().query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`,
    [user_id]
  );
};

export const createRefreshTokenInDB = async (user_id: number, token: string, expires_at: Date) => {
  const query = `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;

  const result = await db().query(query, [user_id, hashToken(token), expires_at]);
  return result.rows[0];
};

export const getValidRefreshTokenFromDB = async (token: string) => {
  const result = await db().query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [hashToken(token)]
  );
  return result.rows[0] ?? null;
};

export const revokeRefreshTokenInDB = async (token: string) => {
  await db().query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)]
  );
};
