import { Router } from "express";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { documentScannerRateLimiter } from "../../shared/middlewares/rate-limit.middleware";
import { uploadScannedDocument } from "./document-scanner.upload";
import { extractDocumentText, scanDocument } from "./document-scanner.controller";

const router = Router();

router.use(authenticate);

// A debugging aid (the throwaway /document-scanner page) - PLATFORM_ADMIN
// only: parsing an uploaded PDF is CPU-heavy, and nothing else needs it.
router.post("/extract-text", requireRole("PLATFORM_ADMIN"), uploadScannedDocument, extractDocumentText);

router.post("/extract", documentScannerRateLimiter, uploadScannedDocument, scanDocument);

export default router;
