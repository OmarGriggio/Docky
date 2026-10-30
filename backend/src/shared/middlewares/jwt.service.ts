import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { Language, Role } from "../../modules/users/user.types";

export type TokenPayload = { userId: number; email: string; role: Role; company_id: number; language: Language };

// Kept as a single constant so the JWT's own expiry and the refresh_tokens.expires_at
// row written alongside it (see auth.service.ts) can never drift apart.
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const generateAccessToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "5h"
  });
};

// A random jwtid: without one, two logins of the same account within the
// same second signed the exact same token (same payload, `iat` in whole
// seconds) - and refresh_tokens.token_hash being unique, the second login
// failed with a 500 (a double click on "Log in" was enough).
export const generateRefreshToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_TTL_MS / 1000,
    jwtid: randomUUID()
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
};
