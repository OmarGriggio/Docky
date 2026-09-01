import { getTypesChantierFromDB, getTypeChantierByIdFromDB, createTypeChantierInDB, deleteTypeChantierInDB } from "./type_chantier.repository";
import { TypeChantier } from "./type_chantier.types";
import { NotFoundError } from "../../shared/types/errors";

export const getAllTypesChantierServ = async () => {
  return await getTypesChantierFromDB();
};

export const addTypeChantierServ = async (typeChantierData: Omit<TypeChantier, "id">) => {
  return await createTypeChantierInDB(typeChantierData);
};

export const deleteTypeChantierServ = async (id: number) => {
  const typeChantier = await getTypeChantierByIdFromDB(id);
  if (!typeChantier) {
    throw new NotFoundError("Type de chantier not found");
  }

  //TODO : Warn user if type chantier is referenced in chantiers
  return await deleteTypeChantierInDB(id);
};
