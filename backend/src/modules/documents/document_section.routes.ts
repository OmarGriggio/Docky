import { Router } from "express";
import { getSections, getUnscheduledSections, getScheduledSections, createSection, updateSection, updateSectionNote, archiveSection, unarchiveSection } from "./document_section.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

// Before "/" - a plain GET / requires its own ?document_id, this one
// doesn't take any query param at all, so there's no ambiguity either way,
// but keeping the more specific route first matches the convention used
// elsewhere (documents/new before documents/:id on the frontend).
router.get("/unscheduled", getUnscheduledSections);

router.get("/scheduled", getScheduledSections);

router.get("/", getSections);

router.post("/", createSection);

router.put("/:id", updateSection);

router.patch("/:id/note", updateSectionNote);

router.patch("/:id/archive", archiveSection);

router.patch("/:id/unarchive", unarchiveSection);

export default router;
