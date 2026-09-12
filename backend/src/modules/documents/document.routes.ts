import { Router } from "express";
import { createDocument, updateDocument, archiveDocument, unarchiveDocument, getDocuments, getDocument, acceptQuote } from "./document.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getDocuments);

router.get("/:id", getDocument);

router.post("/", createDocument);

router.put("/:id", updateDocument);

router.patch("/:id/archive", archiveDocument);

router.patch("/:id/unarchive", unarchiveDocument);

router.post("/:id/accept", acceptQuote);

export default router;
