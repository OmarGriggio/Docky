import { Router } from "express";
import { createFournisseur, archiveFournisseur, unarchiveFournisseur, getFournisseur } from "./fournisseur.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getFournisseur);

router.post("/", createFournisseur);

router.patch("/:id/archive", archiveFournisseur);

router.patch("/:id/unarchive", unarchiveFournisseur);

export default router;
