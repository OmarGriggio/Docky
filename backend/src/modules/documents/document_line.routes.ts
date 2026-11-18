import { Router } from "express";
import { getLines, createLine, archiveLine, unarchiveLine } from "./document_line.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { documentFromBody, documentFromQuery, documentOfLine, requireDocumentPermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// The module of the document the lines belong to.
router.get("/", requireDocumentPermission("READ", documentFromQuery), getLines);

router.post("/", requireDocumentPermission("WRITE", documentFromBody), createLine);

router.patch("/:id/archive", requireDocumentPermission("WRITE", documentOfLine), archiveLine);

router.patch("/:id/unarchive", requireDocumentPermission("WRITE", documentOfLine), unarchiveLine);

export default router;
