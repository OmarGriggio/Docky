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

const router = Router();

router.use(authenticate);

router.get("/", getProjectAttachments);

router.post("/:projectId", uploadAttachment, uploadProjectAttachment);

// Authenticated and company-scoped (unlike /uploads/*splat in app.ts, which
// only ever serves public company logos) - attachments can be private
// business documents (plans, directives, ...).
router.get("/:id/download", downloadProjectAttachment);

router.patch("/:id/archive", archiveProjectAttachment);

router.patch("/:id/unarchive", unarchiveProjectAttachment);

export default router;
