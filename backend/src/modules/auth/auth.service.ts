import bcrypt from "bcrypt";
import { getUserByEmail } from "../users/user.repository";
import { LoginUserData, User } from "../users/user.types";
import { UnauthorizedError } from "../../shared/types/errors";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  REFRESH_TOKEN_TTL_MS,
  TokenPayload
} from "../../shared/middlewares/jwt.service";
import {
  createRefreshTokenInDB,
  getValidRefreshTokenFromDB,
  revokeRefreshTokenInDB
} from "./refresh_token.repository";
import { recordLoginAttemptServ } from "./login_history.service";

// ip/userAgent come from the request (see auth.controller.ts) purely to be
// recorded in login_history - nothing else here needs them.
export const authUserService = async (loginData: LoginUserData, ip: string | null, userAgent: string | null) => {
  const user: User | undefined = await getUserByEmail(loginData.email)

  if (!user) {
    await recordLoginAttemptServ({ user_id: null, email: loginData.email, success: false, ip_address: ip, user_agent: userAgent });
    throw new UnauthorizedError();
  }

  const isPasswordValid = await bcrypt.compare(
    loginData.passwordHash,
    user.password_hash
  );

  if (!isPasswordValid) {
    await recordLoginAttemptServ({ user_id: user.id, email: loginData.email, success: false, ip_address: ip, user_agent: userAgent });
    throw new UnauthorizedError();
  }

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id
  };

  const token = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await createRefreshTokenInDB(user.id, refreshToken, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
  await recordLoginAttemptServ({ user_id: user.id, email: loginData.email, success: true, ip_address: ip, user_agent: userAgent });

  return { token, refreshToken };
};

// Exchanges a still-valid refresh token for a new access token. The refresh
// token itself isn't rotated - it stays valid until it naturally expires (7
// days) or the user logs out. Both the JWT signature/expiry AND the
// refresh_tokens row (not revoked, not expired) have to check out, so a
// logout immediately blocks it even though the JWT itself would still verify.
export const refreshAccessTokenServ = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new UnauthorizedError();
  }

  let payload: TokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError();
  }

  const storedToken = await getValidRefreshTokenFromDB(refreshToken);
  if (!storedToken) {
    throw new UnauthorizedError();
  }

  const token = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    company_id: payload.company_id
  });

  return { token };
};

// Best-effort and idempotent: a missing/already-revoked token isn't an error,
// logout should never fail on the client just because it was called twice.
export const logoutServ = async (refreshToken: string) => {
  if (!refreshToken) {
    return;
  }
  await revokeRefreshTokenInDB(refreshToken);
};
