import { Router } from "express";
import { createFournisseur, getFournisseur } from "../controllers/fournisseur.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getFournisseur);

router.post("/", createFournisseur);

export default router;
