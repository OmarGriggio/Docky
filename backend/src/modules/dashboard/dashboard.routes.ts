import { Router } from "express";
import { getOpenInvoices, getPaidAmountByClient, getProjectsInProgress } from "./dashboard.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/paid-by-client", getPaidAmountByClient);
router.get("/open-invoices", getOpenInvoices);
router.get("/projects-in-progress", getProjectsInProgress);

export default router;
