import { Request, Response } from "express";
import { generateFacturePdfServ, generateSwissQrBillPdfServ } from "./pdf.service";

export const getFacturePdf = async (req: Request, res: Response) => {
  const bytes = await generateFacturePdfServ(Number(req.params.id));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=facture.pdf");

  res.send(Buffer.from(bytes));
};

// TODO: drop the `iban` query param once entreprises.iban exists in DB.
export const getSwissQrBillPdf = async (req: Request, res: Response) => {
  const iban = String(req.query.iban ?? "");
  const compact = req.query.compact === "true";

  const bytes = await generateSwissQrBillPdfServ(Number(req.params.id), iban, compact);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=bulletin-versement.pdf");

  res.send(Buffer.from(bytes));
};
