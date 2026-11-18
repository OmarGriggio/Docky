import { Router } from "express";
import {
  getProjectAttachments,
  uploadProjectAttachment,
  downloadProjectAttachment,
  archiveProjectAttachment,
  unarchiveProjectAttachment
} from "./project_attachment.controller";
import { uploadAttachment } from "./project_attachment.upload";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requirePermission } from "../permissions/permission.middleware";
import { attachmentUploadRateLimiter } from "../../shared/middlewares/rate-limit.middleware";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("projects", "READ"), getProjectAttachments);

router.post("/:projectId", requirePermission("projects", "WRITE"), attachmentUploadRateLimiter, uploadAttachment, uploadProjectAttachment);

// Authenticated and company-scoped (unlike /uploads/*splat in app.ts, which
// only ever serves public company logos) - attachments can be private
// business documents (plans, directives, ...).
router.get("/:id/download", requirePermission("projects", "READ"), downloadProjectAttachment);

router.patch("/:id/archive", requirePermission("projects", "WRITE"), archiveProjectAttachment);

router.patch("/:id/unarchive", requirePermission("projects", "WRITE"), unarchiveProjectAttachment);

export default router;
