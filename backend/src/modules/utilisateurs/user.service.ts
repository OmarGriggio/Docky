import { createEntrepriseInDB } from "../entreprises/entreprise.repository";
import { createUserDB, getUserByEmail, getUsersFromDB, deleteUserDB } from "./user.repository";
import { CreateUserData } from "./user.types";
import bcrypt from "bcrypt";

export const getAllUsers = async (id_entreprise: number) => {
  return await getUsersFromDB(id_entreprise);
};

export const deleteUserService = async (id: Number) => {
  return await deleteUserDB(id);
};

export const createUserService = async (userData: CreateUserData) => {
  const user = await getUserByEmail(userData.email);
  if (!user) {
    //TODO : créer une entreprise vide et ajouter le id au user
    userData.passwordHash = await bcrypt.hash(userData.passwordHash, 10);
    return await createUserDB(userData);
  } else {
    throw new Error("Email already exists");
  }
};