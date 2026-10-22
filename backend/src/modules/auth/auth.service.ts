import bcrypt from "bcrypt";
import { getUserByEmail, getActiveUserByIdFromDB } from "../users/user.repository";
import { LoginUserData, User } from "../users/user.types";
import { getCompanyByIdFromDB } from "../companies/company.repository";
import { NotFoundError, UnauthorizedError } from "../../shared/types/errors";
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

// A real bcrypt hash of nothing in particular - compared against when the
// email doesn't exist, so an unknown email takes as long to reject as a
// wrong password (otherwise the response time alone tells which emails have
// an account).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("docky-timing-equalizer", 10);

// ip/userAgent come from the request (see auth.controller.ts) purely to be
// recorded in login_history - nothing else here needs them.
export const authUserService = async (loginData: LoginUserData, ip: string | null, userAgent: string | null) => {
  const user: User | undefined = await getUserByEmail(loginData.email)

  const isPasswordValid = await bcrypt.compare(
    String(loginData.passwordHash ?? ""),
    user?.password_hash ?? DUMMY_PASSWORD_HASH
  );

  if (!user) {
    await recordLoginAttemptServ({ user_id: null, email: loginData.email, success: false, ip_address: ip, user_agent: userAgent });
    throw new UnauthorizedError();
  }

  // A deactivated account is refused like a wrong password - no hint that
  // it exists.
  if (!isPasswordValid || user.is_active === false) {
    await recordLoginAttemptServ({ user_id: user.id, email: loginData.email, success: false, ip_address: ip, user_agent: userAgent });
    throw new UnauthorizedError();
  }

  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    language: user.language
  };

  const token = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await createRefreshTokenInDB(user.id, refreshToken, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
  await recordLoginAttemptServ({ user_id: user.id, email: loginData.email, success: true, ip_address: ip, user_agent: userAgent });

  return { token, refreshToken };
};

// A PLATFORM_ADMIN "acts as" another company's own ADMIN by swapping into an
// access token carrying that company's own company_id - role stays
// PLATFORM_ADMIN (not downgraded to ADMIN), which is what makes every
// existing endpoint's own `req.user.company_id` scoping work for this for
// free, no endpoint needs to know impersonation exists (see
// zz_docs/Decisions.md's "Cross-company access" entry).
//
// Deliberately does NOT touch the refresh token / refresh_tokens row at all
// - that stays tied to the platform admin's own real company_id. This
// access token is short-lived (5h, same as any other) and isn't renewable
// through POST /auth/refresh; once it expires the frontend just asks the
// user to pick the company again, rather than silently keeping them
// impersonated (or silently dropping them back to their own company)
// through an automatic refresh. Chosen over teaching /auth/refresh about
// impersonation to keep that flow simple - see the Decisions.md entry for
// why this was left open before now.
export const impersonateCompanyServ = async (actor: TokenPayload, companyId: number) => {
  const company = await getCompanyByIdFromDB(companyId);
  if (!company) {
    throw new NotFoundError("Company not found");
  }

  const payload: TokenPayload = {
    userId: actor.userId,
    email: actor.email,
    role: actor.role,
    company_id: companyId,
    language: actor.language
  };

  return { token: generateAccessToken(payload) };
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

  // The account itself, read again - not the claims frozen into the refresh
  // token 7 days ago: a deleted or deactivated user gets nothing, and a
  // changed role/language applies from the next access token on.
  const user = await getActiveUserByIdFromDB(payload.userId);
  if (!user) {
    throw new UnauthorizedError();
  }

  const token = generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    company_id: user.company_id,
    language: user.language
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
