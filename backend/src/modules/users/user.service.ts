import { createUserDB, getUserByEmail, getUserByIdForCompany, getUsersFromDB, deleteUserDB, updateUserLanguageDB } from "./user.repository";
import { CreateUserData, Language, Role } from "./user.types";
import { addCompanyServ } from "../companies/company.service";
import { revokeAllRefreshTokensOfUserInDB } from "../auth/refresh_token.repository";
import { AppError, NotFoundError, ConflictError, ForbiddenError } from "../../shared/types/errors";
import { TokenPayload } from "../../shared/middlewares/jwt.service";
import { withTransaction } from "../../shared/config/database";
import bcrypt from "bcrypt";

// bcrypt only ever looks at the first 72 bytes - anything past that would be
// silently ignored, so it's refused instead. The frontend asks for 8+ too,
// but that was the only place the rule existed.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

const assertValidPassword = (password: unknown) => {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    throw new AppError(`The password needs at least ${PASSWORD_MIN_LENGTH} characters`, 400);
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    throw new AppError(`The password can't be longer than ${PASSWORD_MAX_BYTES} bytes`, 400);
  }
};

export const getAllUsers = async (company_id: number) => {
  return await getUsersFromDB(company_id);
};

// The account's sessions are revoked first, so a refresh token still sitting
// in the removed employee's browser can't mint one more access token (the
// rows themselves go with the user, see 005_cascade_user_deletion.sql).
export const deleteUserService = async (id: number, company_id: number) => {
  const user = await getUserByIdForCompany(id, company_id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  await revokeAllRefreshTokensOfUserInDB(id);
  return await deleteUserDB(id, company_id);
};

// POST /user serves two different flows on purpose:
// - actor === null: unauthenticated self-registration - creates a brand-new
//   company (named by `companyName`) and its first ADMIN, in one transaction.
//   It used to take the company_id of a company created by an earlier, separate
//   POST /company, which let anyone claim any company that had no user yet.
// - actor set: an authenticated PLATFORM_ADMIN adding an employee to a company -
//   company_id is forced from the token (their own, or an impersonated one via
//   POST /auth/impersonate/:companyId - see zz_docs/Decisions.md), never trusted
//   from the request body, and the role is ADMIN or USER, never PLATFORM_ADMIN
//   (that one is only ever created by hand in the database). Deliberately
//   PLATFORM_ADMIN only, not ADMIN - user management was centralized there,
//   see user.routes.ts.
export const createUserService = async (userData: CreateUserData, actor: TokenPayload | null) => {
  assertValidPassword(userData.passwordHash);

  if (await getUserByEmail(userData.email)) {
    throw new ConflictError("Email already exists");
  }
  const passwordHash = await bcrypt.hash(userData.passwordHash, 10);

  if (actor) {
    if (actor.role !== "PLATFORM_ADMIN") {
      throw new ForbiddenError();
    }
    const role: Role = userData.role === "ADMIN" ? "ADMIN" : "USER";
    return await createUserDB({ ...userData, role, company_id: actor.company_id, passwordHash });
  }

  const companyName = typeof userData.companyName === "string" ? userData.companyName.trim() : "";
  if (!companyName) {
    throw new AppError("A company name is required to register", 400);
  }

  return await withTransaction(async () => {
    const company = await addCompanyServ({
      name: companyName,
      email: null,
      phone: null,
      iban: null,
      street: null,
      postal_code: null,
      city: null,
      country: null,
      logo: null,
      header_image: null,
      vat_rate: 8.1,
      vat_number: null,
      payment_terms: null,
      website: null,
      bank_name: null,
      bank_account: null,
      early_payment_discount: 0,
      early_payment_days: null,
      early_payment_min_amount: 0,
    });
    return await createUserDB({ ...userData, role: "ADMIN", company_id: company.id, passwordHash });
  });
};

// Self-only (see user.routes.ts) - the acting user's own id, never a body/param id.
export const updateUserLanguageServ = async (userId: number, language: Language) => {
  const user = await updateUserLanguageDB(userId, language);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};
