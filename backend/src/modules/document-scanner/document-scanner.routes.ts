import { Router } from "express";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { uploadScannedDocument } from "./document-scanner.upload";
import { extractDocumentText } from "./document-scanner.controller";

const router = Router();

router.use(authenticate);

router.post("/extract-text", uploadScannedDocument, extractDocumentText);

export default router;
