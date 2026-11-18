import { Router } from "express";
import { getDocumentComplete, getDocumentsComplete } from "./document_complete.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { documentFromParam, requireDocumentPermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getDocumentsComplete);

router.get("/:id", requireDocumentPermission("READ", documentFromParam), getDocumentComplete);

export default router;
