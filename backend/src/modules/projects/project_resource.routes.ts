import { Router } from "express";
import { getProjectResources, createProjectResource, deleteProjectResource, updateProjectResourceQuantity } from "./project_resource.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getProjectResources);

router.post("/", createProjectResource);

router.patch("/:id", updateProjectResourceQuantity);

router.delete("/:id", deleteProjectResource);

export default router;
