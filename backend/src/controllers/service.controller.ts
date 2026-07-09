import { Request, Response } from "express";
import { getAllServicesServ } from "../services/service.service";

export const getServices = async (req: Request, res: Response) => {
  const services = await getAllServicesServ();
  res.json(services);
};
