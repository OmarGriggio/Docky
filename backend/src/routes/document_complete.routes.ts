import { Router } from "express";
import { getDocumentComplete, getDocumentsComplete } from "../controllers/document_complete.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getDocumentsComplete);

router.get("/:id", getDocumentComplete);

export default router;
