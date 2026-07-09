import { Router } from "express";
import { createOffre, getOffres } from "../controllers/offre.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getOffres);

router.post("/", createOffre);

export default router;
