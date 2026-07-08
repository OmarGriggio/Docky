import { Router } from "express";
import { getMateriels } from "../controllers/materiel.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getMateriels);

export default router;
