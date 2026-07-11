import { Router } from "express";
import { getRessources } from "../controllers/ressource.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getRessources);

export default router;
