import jwt from "jsonwebtoken";
import { Role } from "../../modules/users/user.types";

export type TokenPayload = { userId: number; email: string; role: Role; company_id: number };

// Kept as a single constant so the JWT's own expiry and the refresh_tokens.expires_at
// row written alongside it (see auth.service.ts) can never drift apart.
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const generateAccessToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "5h"
  });
};

export const generateRefreshToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: REFRESH_TOKEN_TTL_MS / 1000
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
};
