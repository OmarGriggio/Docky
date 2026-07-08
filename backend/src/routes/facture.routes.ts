import { Router } from "express";
import { getFactures } from "../controllers/facture.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getFactures);

export default router;
