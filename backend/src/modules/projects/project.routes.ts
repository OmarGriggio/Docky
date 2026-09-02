import { Router } from "express";
import { createProject, archiveProject, unarchiveProject, getProjects, getProjectById } from "./project.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getProjects);

router.get("/:id", getProjectById);

router.post("/", createProject);

router.patch("/:id/archive", archiveProject);

router.patch("/:id/unarchive", unarchiveProject);

export default router;
