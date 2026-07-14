import { Router } from "express";
import { getFacturePdf, getSwissQrBillPdf } from "./pdf.controller";

const router = Router();

router.get("/facture/:id", getFacturePdf);
router.get("/facture/:id/qr-bill", getSwissQrBillPdf);

export default router;
