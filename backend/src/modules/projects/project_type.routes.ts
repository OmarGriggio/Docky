import { Router } from "express";
import { createProjectType, deleteProjectType, getProjectTypes, getProjectTypeById } from "./project_type.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getProjectTypes);

router.get("/:id", getProjectTypeById);

router.post("/", createProjectType);

router.delete("/:id", deleteProjectType);

export default router;
