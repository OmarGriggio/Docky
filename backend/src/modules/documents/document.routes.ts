import { Router } from "express";
import { createDocument, archiveDocument, unarchiveDocument, getDocuments } from "./document.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getDocuments);

router.post("/", createDocument);

router.patch("/:id/archive", archiveDocument);

router.patch("/:id/unarchive", unarchiveDocument);

export default router;
