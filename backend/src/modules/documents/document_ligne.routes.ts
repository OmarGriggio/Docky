import { Router } from "express";
import { getLignes, createLigne, archiveLigne, unarchiveLigne } from "./document_ligne.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getLignes);

router.post("/", createLigne);

router.patch("/:id/archive", archiveLigne);

router.patch("/:id/unarchive", unarchiveLigne);

export default router;
