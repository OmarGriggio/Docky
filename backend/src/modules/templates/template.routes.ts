import { Router } from "express";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { requireAnyPermission } from "../permissions/permission.middleware";
import { uploadHeaderImage } from "../companies/company.upload";
import { templatePreviewRateLimiter } from "../../shared/middlewares/rate-limit.middleware";
import {
  archiveTemplate, createTemplate, duplicateTemplate, getTemplate, getTemplates, previewTemplate, removeTemplateHeaderImage,
  setDefaultTemplate, unarchiveTemplate, updateTemplate, uploadTemplateHeaderImage,
} from "./template.controller";

const router = Router();

router.use(authenticate);

// Read by the quote and invoice forms (an employee picks a document's
// template there); managed by the company's admin only, like its profile.
const readTemplates = requireAnyPermission(["quotes", "invoices"], "READ");
const manageTemplates = requireRole("ADMIN", "PLATFORM_ADMIN");

router.get("/", readTemplates, getTemplates);
router.get("/:id", readTemplates, getTemplate);
// A sample PDF of the template as it's being edited - nothing written. The
// editor shows it to anyone reading the templates (read only for all but the
// admin), rate-limited per user: each call builds a whole PDF.
router.post("/:id/preview", readTemplates, templatePreviewRateLimiter, previewTemplate);

router.post("/", manageTemplates, createTemplate);
router.post("/:id/duplicate", manageTemplates, duplicateTemplate);
router.put("/:id", manageTemplates, updateTemplate);
router.patch("/:id/default", manageTemplates, setDefaultTemplate);
router.patch("/:id/archive", manageTemplates, archiveTemplate);
router.patch("/:id/unarchive", manageTemplates, unarchiveTemplate);
router.post("/:id/header-image", manageTemplates, uploadHeaderImage, uploadTemplateHeaderImage);
router.delete("/:id/header-image", manageTemplates, removeTemplateHeaderImage);

export default router;
