import { Router } from "express";
import { getCatalogue } from "../controllers/catalogue.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getCatalogue);

export default router;
