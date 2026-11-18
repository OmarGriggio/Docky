import { Router } from "express";
import { getDocumentTemplate, upsertDocumentTemplate } from "./document_template.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireAnyPermission, requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// Read by the quote and invoice forms; a type's texts changed with its
// module (the reminder's with the invoices).
router.get("/", requireAnyPermission(["quotes", "invoices"], "READ"), getDocumentTemplate);

router.put("/:type", (req, res, next) => requirePermission(req.params.type === "QUOTE" ? "quotes" : "invoices", "WRITE")(req, res, next), upsertDocumentTemplate);

export default router;
