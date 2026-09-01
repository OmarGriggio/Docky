import { Router } from "express";
import { createChantier, archiveChantier, unarchiveChantier, getChantiers } from "./chantier.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getChantiers);

router.post("/", createChantier);

router.patch("/:id/archive", archiveChantier);

router.patch("/:id/unarchive", unarchiveChantier);

export default router;
