import { Request, Response } from "express";
import { addClientServ, archiveClientServ, unarchiveClientServ, getAllClientsServ, getClientByIdServ } from "./client.service";
import { Client } from "./client.types";

export const getClients = async (req: Request, res: Response) => {
  const id_entreprise = req.user.id_entreprise
  const includeArchived = req.query.includeArchived === "true"
  const clients = await getAllClientsServ(id_entreprise, includeArchived);
  res.json(clients);
};

export const getClient = async (req: Request, res: Response) => {
  const client = await getClientByIdServ(Number(req.params.id), req.user.id_entreprise);
  res.json(client);
};


export const createClient = async (req: Request, res: Response) => {
    const clientData : Omit<Client, "id" | "id_entreprise"> = req.body

    const clientCreated = await addClientServ(clientData, req.user!.id_entreprise);
    res.json(clientCreated);
};

export const archiveClient = async (req: Request, res: Response) => {
  const clientArchived = await archiveClientServ(Number(req.params.id), req.user.id_entreprise)
  res.json(clientArchived)
}

export const unarchiveClient = async (req: Request, res: Response) => {
  const clientUnarchived = await unarchiveClientServ(Number(req.params.id), req.user.id_entreprise)
  res.json(clientUnarchived)
}
