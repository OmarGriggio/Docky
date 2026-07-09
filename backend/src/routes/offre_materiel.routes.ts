import { Router } from "express";
import { createOffreMateriel, getOffreMateriels } from "../controllers/offre_materiel.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getOffreMateriels);

router.post("/", createOffreMateriel);

export default router;
