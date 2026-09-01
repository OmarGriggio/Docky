import { createEntrepriseInDB } from "../entreprises/entreprise.repository";
import { createUserDB, getUserByEmail, getUserByIdForEntreprise, getUsersFromDB, deleteUserDB } from "./user.repository";
import { CreateUserData } from "./user.types";
import { NotFoundError, ConflictError, ForbiddenError } from "../../shared/types/errors";
import { TokenPayload } from "../../shared/middlewares/jwt.service";
import bcrypt from "bcrypt";

export const getAllUsers = async (id_entreprise: number) => {
  return await getUsersFromDB(id_entreprise);
};

export const deleteUserService = async (id: Number, id_entreprise: number) => {
  const user = await getUserByIdForEntreprise(id, id_entreprise);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return await deleteUserDB(id, id_entreprise);
};

// POST /user serves two different flows on purpose:
// - actor === null: unauthenticated self-registration — only allowed to create the
//   first ADMIN of a brand-new company (id_entreprise must have zero existing users).
// - actor set: an authenticated ADMIN adding an employee to their OWN company —
//   id_entreprise is forced from the token, never trusted from the request body.
export const createUserService = async (userData: CreateUserData, actor: TokenPayload | null) => {
  if (actor) {
    if (actor.role !== "ADMIN") {
      throw new ForbiddenError();
    }
    userData.id_entreprise = actor.id_entreprise;
  } else {
    const existingUsers = await getUsersFromDB(userData.id_entreprise);
    if (existingUsers.length > 0) {
      throw new ForbiddenError("This company already has members — log in as an admin to add users");
    }
    userData.role = "ADMIN";
  }

  const user = await getUserByEmail(userData.email);
  if (!user) {
    //TODO : créer une entreprise vide et ajouter le id au user
    userData.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
    return await createUserDB(userData);
  } else {
    throw new ConflictError("Email already exists");
  }
};