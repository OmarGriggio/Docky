import { Router } from "express";
import { getInvoicePdf, getQuotePdf } from "./pdf.controller";
import { authenticate } from "../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/invoice/:id", getInvoicePdf);

router.get("/quote/:id", getQuotePdf);

export default router;
