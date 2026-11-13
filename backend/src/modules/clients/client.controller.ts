import { Request, Response } from "express";
import { addClientServ, updateClientServ, archiveClientServ, unarchiveClientServ, getAllClientsServ, getClientByIdServ, importClientsServ } from "./client.service";
import { Client, NewClientAddress, UpdateClientData } from "./client.types";

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
    const { address, client_number: _ignored, ...clientData }: Omit<Client, "id" | "company_id"> & { address?: NewClientAddress | null } = req.body

    const clientCreated = await addClientServ(clientData, req.user!.company_id, address);
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

// ?dryRun=true: the preview - every row judged, nothing written. A real import
// with any row in error writes nothing either, and answers 422 with the same
// report (the user's own data to fix, not a server failure).
export const importClients = async (req: Request, res: Response) => {
  const report = await importClientsServ(req.user.company_id, req.body, req.query.dryRun === "true");
  const failed = req.query.dryRun !== "true" && report.created === 0 && report.rows.some(row => row.errors.length > 0);
  res.status(failed ? 422 : 200).json(report);
};
