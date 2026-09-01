import { createEntrepriseInDB } from "../entreprises/entreprise.repository";
import { createUserDB, getUserByEmail, getUserByIdForEntreprise, getUsersFromDB, deleteUserDB } from "./user.repository";
import { CreateUserData } from "./user.types";
import { NotFoundError, ConflictError } from "../../shared/types/errors";
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

export const createUserService = async (userData: CreateUserData) => {
  const user = await getUserByEmail(userData.email);
  if (!user) {
    //TODO : créer une entreprise vide et ajouter le id au user
    userData.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
    return await createUserDB(userData);
  } else {
    throw new ConflictError("Email already exists");
  }
};