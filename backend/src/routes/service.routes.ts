import { Router } from "express";
import { getServices } from "../controllers/service.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getServices);

export default router;
