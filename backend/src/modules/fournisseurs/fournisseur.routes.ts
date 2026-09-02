import { Router } from "express";
import { createFournisseur, archiveFournisseur, unarchiveFournisseur, getFournisseur, getFournisseurById } from "./fournisseur.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getFournisseur);

router.get("/:id", getFournisseurById);

router.post("/", createFournisseur);

router.patch("/:id/archive", archiveFournisseur);

router.patch("/:id/unarchive", unarchiveFournisseur);

export default router;
