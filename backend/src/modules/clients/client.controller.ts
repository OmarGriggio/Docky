import { Request, Response } from "express";
import { addClientServ, updateClientServ, archiveClientServ, unarchiveClientServ, getAllClientsServ, getClientByIdServ } from "./client.service";
import { Client, UpdateClientData } from "./client.types";

export const getClients = async (req: Request, res: Response) => {
  const company_id = req.user.company_id
  const includeArchived = req.query.includeArchived === "true"
  const clients = await getAllClientsServ(company_id, includeArchived);
  res.json(clients);
};

export const getClient = async (req: Request, res: Response) => {
  const client = await getClientByIdServ(Number(req.params.id), req.user.company_id);
  res.json(client);
};


export const createClient = async (req: Request, res: Response) => {
    const clientData : Omit<Client, "id" | "company_id"> = req.body

    const clientCreated = await addClientServ(clientData, req.user!.company_id);
    res.json(clientCreated);
};

export const updateClient = async (req: Request, res: Response) => {
    const clientData: UpdateClientData = req.body;

    const clientUpdated = await updateClientServ(Number(req.params.id), req.user.company_id, clientData);
    res.json(clientUpdated);
};

export const archiveClient = async (req: Request, res: Response) => {
  const clientArchived = await archiveClientServ(Number(req.params.id), req.user.company_id)
  res.json(clientArchived)
}

export const unarchiveClient = async (req: Request, res: Response) => {
  const clientUnarchived = await unarchiveClientServ(Number(req.params.id), req.user.company_id)
  res.json(clientUnarchived)
}
