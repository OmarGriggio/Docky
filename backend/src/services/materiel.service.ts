import { getMaterielsFromDB } from "../repositories/materiel.repository";

export const getAllMaterielsServ = async () => {
  return await getMaterielsFromDB();
};