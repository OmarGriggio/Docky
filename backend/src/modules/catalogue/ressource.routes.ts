import { Router } from "express";
import { getRessources, archiveRessource, unarchiveRessource } from "./ressource.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getRessources);

router.patch("/:id/archive", archiveRessource);

router.patch("/:id/unarchive", unarchiveRessource);

export default router;
