import { Router } from "express";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { documentFromParam, requireDocumentPermission, requirePermission } from "../permissions/permission.middleware";
import {
  deleteReminder, getInvoiceReminders, getInvoicesToRemind, getReminderSettings, sendReminder, updateReminderSettings,
} from "./reminder.controller";

// Payment reminders: the levels (Paramètres > Rappels - read by anyone
// reading invoices, set by the company's admin), the invoices to remind
// (the dashboard's card), an invoice's reminders - sent and taken back like
// any change to an invoice (invoices WRITE). Every id is the company's own.
const router = Router();

router.use(authenticate);

router.get("/settings", requirePermission("invoices", "READ"), getReminderSettings);
router.put("/settings", requireRole("ADMIN", "PLATFORM_ADMIN"), updateReminderSettings);

router.get("/to-send", requirePermission("dashboard", "READ"), requirePermission("invoices", "READ"), getInvoicesToRemind);

router.get("/document/:id", requirePermission("invoices", "READ"), requireDocumentPermission("READ", documentFromParam), getInvoiceReminders);
router.post("/document/:id", requirePermission("invoices", "WRITE"), requireDocumentPermission("WRITE", documentFromParam), sendReminder);

router.delete("/:id", requirePermission("invoices", "WRITE"), deleteReminder);

export default router;
