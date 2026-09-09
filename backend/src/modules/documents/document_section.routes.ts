import { Router } from "express";
import { getSections, createSection, archiveSection, unarchiveSection } from "./document_section.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getSections);

router.post("/", createSection);

router.patch("/:id/archive", archiveSection);

router.patch("/:id/unarchive", unarchiveSection);

export default router;
