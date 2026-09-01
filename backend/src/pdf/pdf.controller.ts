import { Request, Response } from "express";
import { generateFacturePdfServ } from "./pdf.service";

export const getFacturePdf = async (req: Request, res: Response) => {
  const bytes = await generateFacturePdfServ(Number(req.params.id), req.user.id_entreprise);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=facture.pdf");

  res.send(Buffer.from(bytes));
};
