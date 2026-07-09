import { Router } from "express";
import { createOffreService, getOffreServices } from "../controllers/offre_service.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getOffreServices);

router.post("/", createOffreService);

export default router;
