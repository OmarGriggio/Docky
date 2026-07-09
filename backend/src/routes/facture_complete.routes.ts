import { Router } from "express";
import { getFactureComplete, getFacturesComplete } from "../controllers/facture_complete.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getFacturesComplete);

router.get("/:id", getFactureComplete);

export default router;
