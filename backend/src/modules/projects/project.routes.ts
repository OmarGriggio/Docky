import { Router } from "express";
import { createProject, updateProject, archiveProject, unarchiveProject, completeProject, getProjectBilling, createDepositInvoice, getProjects, getProjectById } from "./project.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getProjects);

router.get("/:id", getProjectById);

router.post("/", createProject);

router.put("/:id", updateProject);

router.patch("/:id/archive", archiveProject);

router.patch("/:id/unarchive", unarchiveProject);

router.patch("/:id/complete", completeProject);

// Its billing: deposit invoices so far, and asking for a new one (deposit.ts).
router.get("/:id/billing", getProjectBilling);

router.post("/:id/deposit-invoice", createDepositInvoice);

export default router;
