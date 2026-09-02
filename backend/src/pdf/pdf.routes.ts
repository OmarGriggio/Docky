import { Router } from "express";
import { getInvoicePdf } from "./pdf.controller";
import { authenticate } from "../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/invoice/:id", getInvoicePdf);

export default router;
