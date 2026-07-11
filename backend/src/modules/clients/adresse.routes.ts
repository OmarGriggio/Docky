import { Router } from "express";
import { createAdresse, getAdresses } from "./adresse.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.get("/", getAdresses);

router.post("/", createAdresse);

export default router;
