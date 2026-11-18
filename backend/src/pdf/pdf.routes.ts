import { Router } from "express";
import { getInvoicePdf, getQuotePdf, getReminderPdf, getQrBillSlip } from "./pdf.controller";
import { authenticate } from "../shared/middlewares/auth.middleware";
import { requirePermission } from "../modules/permissions/permission.middleware";

const router = Router();

router.use(authenticate);

router.get("/invoice/:id", requirePermission("invoices", "READ"), getInvoicePdf);

router.get("/quote/:id", requirePermission("quotes", "READ"), getQuotePdf);

router.get("/reminder/:id", requirePermission("invoices", "READ"), getReminderPdf);

router.post("/qr-bill-slip", requirePermission("invoices", "READ"), getQrBillSlip);

export default router;
