import { Router } from "express";
import { getRessourceTarifsFournisseurs } from "./ressource_tarif_fournisseur.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getRessourceTarifsFournisseurs);

export default router;
