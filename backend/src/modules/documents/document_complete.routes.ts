import { Router } from "express";
import { getDocumentComplete, getDocumentsComplete } from "./document_complete.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getDocumentsComplete);

router.get("/:id", getDocumentComplete);

export default router;
