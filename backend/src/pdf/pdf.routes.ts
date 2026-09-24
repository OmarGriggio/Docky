import { Router } from "express";
import { getInvoicePdf, getQuotePdf, getReminderPdf } from "./pdf.controller";
import { authenticate } from "../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/invoice/:id", getInvoicePdf);

router.get("/quote/:id", getQuotePdf);

router.get("/reminder/:id", getReminderPdf);

export default router;
