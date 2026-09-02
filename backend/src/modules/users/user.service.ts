import { createUserDB, getUserByEmail, getUserByIdForCompany, getUsersFromDB, deleteUserDB } from "./user.repository";
import { CreateUserData } from "./user.types";
import { NotFoundError, ConflictError, ForbiddenError } from "../../shared/types/errors";
import { TokenPayload } from "../../shared/middlewares/jwt.service";
import bcrypt from "bcrypt";

export const getAllUsers = async (company_id: number) => {
  return await getUsersFromDB(company_id);
};

export const deleteUserService = async (id: Number, company_id: number) => {
  const user = await getUserByIdForCompany(id, company_id);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return await deleteUserDB(id, company_id);
};

// POST /user serves two different flows on purpose:
// - actor === null: unauthenticated self-registration — only allowed to create the
//   first ADMIN of a brand-new company (company_id must have zero existing users).
// - actor set: an authenticated ADMIN adding an employee to their OWN company —
//   company_id is forced from the token, never trusted from the request body.
export const createUserService = async (userData: CreateUserData, actor: TokenPayload | null) => {
  if (actor) {
    if (actor.role !== "ADMIN") {
      throw new ForbiddenError();
    }
    userData.company_id = actor.company_id;
  } else {
    const existingUsers = await getUsersFromDB(userData.company_id);
    if (existingUsers.length > 0) {
      throw new ForbiddenError("This company already has members — log in as an admin to add users");
    }
    userData.role = "ADMIN";
  }

  const user = await getUserByEmail(userData.email);
  if (!user) {
    userData.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
    return await createUserDB(userData);
  } else {
    throw new ConflictError("Email already exists");
  }
};
