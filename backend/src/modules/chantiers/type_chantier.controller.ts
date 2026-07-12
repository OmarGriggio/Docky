import { Request, Response } from "express";
import { addTypeChantierServ, deleteTypeChantierServ, getAllTypesChantierServ } from "./type_chantier.service";
import { TypeChantier } from "./type_chantier.types";

export const getTypesChantier = async (req: Request, res: Response) => {
  const typesChantier = await getAllTypesChantierServ();
  res.json(typesChantier);
};

export const createTypeChantier = async (req: Request, res: Response) => {
  const typeChantierData: Omit<TypeChantier, "id"> = req.body;

  const typeChantierCreated = await addTypeChantierServ(typeChantierData);
  res.json(typeChantierCreated);
};

export const deleteTypeChantier = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  const typeChantierDeleted = await deleteTypeChantierServ(id);
  res.json(typeChantierDeleted);
};
