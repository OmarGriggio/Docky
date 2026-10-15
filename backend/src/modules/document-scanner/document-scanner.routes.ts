import { Router } from "express";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { uploadScannedDocument } from "./document-scanner.upload";
import { extractDocumentText, scanDocument } from "./document-scanner.controller";

const router = Router();

router.use(authenticate);

router.post("/extract-text", uploadScannedDocument, extractDocumentText);

router.post("/extract", uploadScannedDocument, scanDocument);

export default router;
