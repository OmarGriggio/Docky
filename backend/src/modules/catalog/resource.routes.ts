import { Router } from "express";
import { getResources, archiveResource, unarchiveResource } from "./resource.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getResources);

router.patch("/:id/archive", archiveResource);

router.patch("/:id/unarchive", unarchiveResource);

export default router;
