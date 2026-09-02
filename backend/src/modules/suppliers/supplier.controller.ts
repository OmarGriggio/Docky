import { Request, Response } from "express";
import { addSupplierServ, archiveSupplierServ, unarchiveSupplierServ, getAllSuppliersServ, getSupplierByIdServ } from "./supplier.service";
import { Supplier } from "./supplier.types";

export const getSuppliers = async (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === "true";
  const suppliers = await getAllSuppliersServ(req.user.company_id, includeArchived);
  res.json(suppliers);
};

export const getSupplierById = async (req: Request, res: Response) => {
  const supplier = await getSupplierByIdServ(Number(req.params.id), req.user.company_id);
  res.json(supplier);
};

export const createSupplier = async (req: Request, res: Response) => {
  const supplierData: Omit<Supplier, "id" | "company_id"> = req.body;

  const supplierCreated = await addSupplierServ(supplierData, req.user.company_id);
  res.json(supplierCreated);
};

export const archiveSupplier = async (req: Request, res: Response) => {
  const supplierArchived = await archiveSupplierServ(Number(req.params.id), req.user.company_id);
  res.json(supplierArchived);
};

export const unarchiveSupplier = async (req: Request, res: Response) => {
  const supplierUnarchived = await unarchiveSupplierServ(Number(req.params.id), req.user.company_id);
  res.json(supplierUnarchived);
};
