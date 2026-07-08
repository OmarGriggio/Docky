import { Router } from "express";
import { getFournisseur } from "../controllers/fournisseur.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getFournisseur);

export default router;
