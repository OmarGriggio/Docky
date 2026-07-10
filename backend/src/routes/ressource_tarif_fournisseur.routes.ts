import { Router } from "express";
import { getRessourceTarifsFournisseurs } from "../controllers/ressource_tarif_fournisseur.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getRessourceTarifsFournisseurs);

export default router;
