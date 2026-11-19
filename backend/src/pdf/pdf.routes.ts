import { Router } from "express";
import { getInvoicePdf, getQuotePdf, getReminderPdf, getQrBillSlip } from "./pdf.controller";
import { authenticate } from "../shared/middlewares/auth.middleware";
import { documentFromParam, requireDocumentPermission, requirePermission } from "../modules/permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// The module of the document itself, not just the URL's: each generator also
// refuses a document of another type (a 404).
router.get("/invoice/:id", requirePermission("invoices", "READ"), requireDocumentPermission("READ", documentFromParam), getInvoicePdf);

router.get("/quote/:id", requirePermission("quotes", "READ"), requireDocumentPermission("READ", documentFromParam), getQuotePdf);

router.get("/reminder/:id", requirePermission("invoices", "READ"), requireDocumentPermission("READ", documentFromParam), getReminderPdf);

router.post("/qr-bill-slip", requirePermission("invoices", "READ"), getQrBillSlip);

export default router;
