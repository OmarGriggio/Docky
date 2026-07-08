import { Request, Response } from "express";
import { addClientServ, deleteClientServ, getAllClientsServ } from "../services/client.service";
import { Client } from "../types/client";

export const getClients = async (req: Request, res: Response) => {
  const clients = await getAllClientsServ();
  res.json(clients);
};


export const createClient = async (req: Request, res: Response) => {
    const clientData : Client = req.body

    const userCreated = await addClientServ(clientData);
    res.json(userCreated);
};

export const deleteClient = async (req: Request, res: Response) => {
  const clientData : Client = req.body

  const userDeleted = await deleteClientServ(clientData)
  res.json(userDeleted)
}
