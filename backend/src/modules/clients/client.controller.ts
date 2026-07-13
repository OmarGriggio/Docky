import { Request, Response } from "express";
import { addClientServ, deleteClientServ, getAllClientsServ, getClientByIdServ } from "./client.service";
import { Client } from "./client.types";

export const getClients = async (req: Request, res: Response) => {
  const id_entreprise = req.user.id_entreprise
  const clients = await getAllClientsServ(id_entreprise);
  res.json(clients);
};

export const getClient = async (req: Request, res: Response) => {
  const client = await getClientByIdServ(Number(req.params.id));
  res.json(client);
};


export const createClient = async (req: Request, res: Response) => {
    const clientData : Omit<Client, "id" | "id_entreprise"> = req.body

    const clientCreated = await addClientServ(clientData, req.user!.id_entreprise);
    res.json(clientCreated);
};

export const deleteClient = async (req: Request, res: Response) => {
  const { num_client } = req.body

  const clientDeleted = await deleteClientServ(num_client)
  res.json(clientDeleted)
}
