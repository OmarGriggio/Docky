import { Router } from "express";
import { getOpenInvoices, getPaidAmountByClient, getProjectsInProgress } from "./dashboard.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// The dashboard module, and the one each card is about.
router.use(requirePermission("dashboard", "READ"));

router.get("/paid-by-client", requirePermission("invoices", "READ"), getPaidAmountByClient);
router.get("/open-invoices", requirePermission("invoices", "READ"), getOpenInvoices);
router.get("/projects-in-progress", requirePermission("projects", "READ"), getProjectsInProgress);

export default router;
