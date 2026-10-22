import { Request, Response } from "express";
import { generateInvoicePdfServ, generateQuotePdfServ, generateReminderPdfServ } from "./pdf.service";
import { generateQrBillSlipSvgServ } from "./qr-bill-slip";

export const getInvoicePdf = async (req: Request, res: Response) => {
  const bytes = await generateInvoicePdfServ(Number(req.params.id), req.user.company_id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");

  res.send(Buffer.from(bytes));
};

export const getReminderPdf = async (req: Request, res: Response) => {
  const bytes = await generateReminderPdfServ(Number(req.params.id), req.user.company_id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=reminder.pdf");

  res.send(Buffer.from(bytes));
};

export const getQuotePdf =async (req: Request, res: Response) => {
  const bytes = await generateQuotePdfServ(Number(req.params.id), req.user.company_id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=quote.pdf");

  res.send(Buffer.from(bytes));
};

// The standalone payment slip (no document behind it) - see qr-bill-slip.ts.
export const getQrBillSlip = async (req: Request, res: Response) => {
  const svg = await generateQrBillSlipSvgServ(req.user.company_id, req.body ?? {});

  res.setHeader("Content-Type", "image/svg+xml");
  res.send(svg);
};
