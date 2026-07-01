import { Request, Response } from "express";
import { getAllClients } from "../services/client.service";

export const getClients = async (req: Request, res: Response) => {
  const clients = await getAllClients();
  res.json(clients);
};