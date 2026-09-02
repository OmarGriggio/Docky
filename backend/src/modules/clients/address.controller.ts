import { Request, Response } from "express";
import { addAddressServ, deleteAddressServ, getAllAddressesServ } from "./address.service";
import { Address } from "./address.types";

export const getAddresses = async (req: Request, res: Response) => {
  const addresses = await getAllAddressesServ(req.user.company_id);
  res.json(addresses);
};

export const createAddress = async (req: Request, res: Response) => {
  const addressData: Omit<Address, "id" | "company_id"> = req.body;

  const addressCreated = await addAddressServ(addressData, req.user.company_id);
  res.json(addressCreated);
};

export const deleteAddress = async (req: Request, res: Response) => {
  const addressDeleted = await deleteAddressServ(Number(req.params.id), req.user.company_id);
  res.json(addressDeleted);
};
