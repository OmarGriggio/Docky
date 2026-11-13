import { Router } from "express";
import { createDocument, updateDocument, archiveDocument, unarchiveDocument, getDocuments, getDocument, getDocumentDeductions, acceptQuote, updateDocumentStatus, replaceDocumentContent } from "./document.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getDocuments);

router.get("/:id", getDocument);

// A chantier's final invoice: the deposits it deducts and what's left to pay.
router.get("/:id/deductions", getDocumentDeductions);

router.post("/", createDocument);

router.put("/:id", updateDocument);

router.put("/:id/content", replaceDocumentContent);

router.patch("/:id/archive", archiveDocument);

router.patch("/:id/unarchive", unarchiveDocument);

router.post("/:id/accept", acceptQuote);

router.patch("/:id/status", updateDocumentStatus);

export default router;
