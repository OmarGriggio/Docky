import { Router } from "express";
import { createProject, updateProject, archiveProject, unarchiveProject, completeProject, getProjectBilling, createDepositInvoice, getProjects, getProjectById } from "./project.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

const readProjects = requirePermission("projects", "READ");
const writeProjects = requirePermission("projects", "WRITE");

router.get("/", readProjects, getProjects);

router.get("/:id", readProjects, getProjectById);

router.post("/", writeProjects, createProject);

router.put("/:id", writeProjects, updateProject);

router.patch("/:id/archive", writeProjects, archiveProject);

router.patch("/:id/unarchive", writeProjects, unarchiveProject);

router.patch("/:id/complete", writeProjects, completeProject);

// Its billing: deposit invoices so far, and asking for a new one (deposit.ts).
// The chantier's invoicing: the invoices module.
router.get("/:id/billing", readProjects, requirePermission("invoices", "READ"), getProjectBilling);

router.post("/:id/deposit-invoice", readProjects, requirePermission("invoices", "WRITE"), createDepositInvoice);

export default router;
