import { Router } from "express";
import { createFournisseur, deleteFournisseur, getFournisseur } from "./fournisseur.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getFournisseur);

router.post("/", createFournisseur);

router.delete("/", deleteFournisseur);

export default router;
