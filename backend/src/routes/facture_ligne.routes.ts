
import { Router } from "express";
import { getFacturesLignes } from "../controllers/facture_ligne.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getFacturesLignes);

export default router;
