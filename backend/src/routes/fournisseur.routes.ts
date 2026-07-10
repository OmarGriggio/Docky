import { Router } from "express";
import { createFournisseur, deleteFournisseur, getFournisseur } from "../controllers/fournisseur.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getFournisseur);

router.post("/", createFournisseur);

router.delete("/", deleteFournisseur);

export default router;
