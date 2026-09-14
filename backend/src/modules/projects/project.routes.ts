import { Router } from "express";
import { createProject, updateProject, archiveProject, unarchiveProject, completeProject, getProjects, getProjectById } from "./project.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getProjects);

router.get("/:id", getProjectById);

router.post("/", createProject);

router.put("/:id", updateProject);

router.patch("/:id/archive", archiveProject);

router.patch("/:id/unarchive", unarchiveProject);

router.patch("/:id/complete", completeProject);

export default router;
