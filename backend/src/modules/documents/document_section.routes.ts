import { Router } from "express";
import { getSections, getUnscheduledSections, getScheduledSections, createSection, updateSection, updateSectionNote, archiveSection, unarchiveSection } from "./document_section.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { documentFromBody, documentFromQuery, documentOfSection, requireDocumentPermission, requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// Before "/" - a plain GET / requires its own ?document_id, this one
// doesn't take any query param at all, so there's no ambiguity either way,
// but keeping the more specific route first matches the convention used
// elsewhere (documents/new before documents/:id on the frontend).
// The calendar's own lists; otherwise the module of the document the
// section belongs to - its dates and note planned from the calendar too.
router.get("/unscheduled", requirePermission("calendar", "READ"), getUnscheduledSections);

router.get("/scheduled", requirePermission("calendar", "READ"), getScheduledSections);

router.get("/", requireDocumentPermission("READ", documentFromQuery), getSections);

router.post("/", requireDocumentPermission("WRITE", documentFromBody), createSection);

router.put("/:id", requireDocumentPermission("WRITE", documentOfSection, "calendar"), updateSection);

router.patch("/:id/note", requireDocumentPermission("WRITE", documentOfSection, "calendar"), updateSectionNote);

router.patch("/:id/archive", requireDocumentPermission("WRITE", documentOfSection), archiveSection);

router.patch("/:id/unarchive", requireDocumentPermission("WRITE", documentOfSection), unarchiveSection);

export default router;
