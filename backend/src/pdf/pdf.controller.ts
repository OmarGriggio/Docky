import { Request, Response } from "express";
import { generateInvoicePdfServ, generateQuotePdfServ } from "./pdf.service";

export const getInvoicePdf = async (req: Request, res: Response) => {
  const bytes = await generateInvoicePdfServ(Number(req.params.id), req.user.company_id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");

  res.send(Buffer.from(bytes));
};

export const getQuotePdf = async (req: Request, res: Response) => {
  const bytes = await generateQuotePdfServ(Number(req.params.id), req.user.company_id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=quote.pdf");

  res.send(Buffer.from(bytes));
};
