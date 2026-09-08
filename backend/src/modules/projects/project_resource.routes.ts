import { Router } from "express";
import { getProjectResources, createProjectResource, deleteProjectResource } from "./project_resource.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getProjectResources);

router.post("/", createProjectResource);

router.delete("/:id", deleteProjectResource);

export default router;
