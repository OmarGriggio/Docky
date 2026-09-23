import { Router } from "express";
import { getOpenInvoicesTotal, getPaidAmountByClient } from "./dashboard.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/paid-by-client", getPaidAmountByClient);
router.get("/open-invoices-total", getOpenInvoicesTotal);

export default router;
