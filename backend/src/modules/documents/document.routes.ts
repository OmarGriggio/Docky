import { Router } from "express";
import { createDocument, updateDocument, archiveDocument, unarchiveDocument, getDocuments, getDocument, getDocumentDeductions, acceptQuote, updateDocumentStatus, replaceDocumentContent } from "./document.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { documentFromParam, requireDocumentPermission, requireDocumentTypePermission, requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// The module of the document touched (permissions.ts's moduleOfDocumentType)
// - a list without a type only returns the types readable (the controller).
const readDocument = requireDocumentPermission("READ", documentFromParam);
const writeDocument = requireDocumentPermission("WRITE", documentFromParam);

router.get("/", getDocuments);

router.get("/:id", readDocument, getDocument);

// A chantier's final invoice: the deposits it deducts and what's left to pay.
router.get("/:id/deductions", readDocument, getDocumentDeductions);

router.post("/", requireDocumentTypePermission("WRITE"), createDocument);

router.put("/:id", writeDocument, updateDocument);

router.put("/:id/content", writeDocument, replaceDocumentContent);

router.patch("/:id/archive", writeDocument, archiveDocument);

router.patch("/:id/unarchive", writeDocument, unarchiveDocument);

// Accepting a quote creates its chantier.
router.post("/:id/accept", writeDocument, requirePermission("projects", "WRITE"), acceptQuote);

router.patch("/:id/status", writeDocument, updateDocumentStatus);

export default router;
