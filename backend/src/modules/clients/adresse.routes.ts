import { Router } from "express";
import { createAdresse, getAdresses } from "../controllers/adresse.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getAdresses);

router.post("/", createAdresse);

export default router;
