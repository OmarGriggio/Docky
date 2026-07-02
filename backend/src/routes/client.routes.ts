import { Router } from "express";
import { getClients } from "../controllers/client.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticate, getClients);

export default router;
