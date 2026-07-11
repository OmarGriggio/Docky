import { Request, Response } from "express";
import { addClientServ, deleteClientServ, getAllClientsServ, getClientByIdServ } from "./client.service";
import { Client } from "./client.types";

export const getClients = async (req: Request, res: Response) => {
  const clients = await getAllClientsServ();
  res.json(clients);
};

export const getClient = async (req: Request, res: Response) => {
  const client = await getClientByIdServ(Number(req.params.id));
  res.json(client);
};


export const createClient = async (req: Request, res: Response) => {
    const clientData : Omit<Client, "id"> = req.body

    const clientCreated = await addClientServ(clientData);
    res.json(clientCreated);
};

export const deleteClient = async (req: Request, res: Response) => {
  const { num_client } = req.body

  const clientDeleted = await deleteClientServ(num_client)
  res.json(clientDeleted)
}
