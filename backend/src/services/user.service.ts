import { createEntrepriseInDB } from "../repositories/entreprise.repository";
import { createUserDB, getUserByEmail, getUsersFromDB } from "../repositories/user.repository";
import { CreateUserData } from "../types/user";
import bcrypt from "bcrypt";

export const getAllUsers = async () => {
  return await getUsersFromDB();
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