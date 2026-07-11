import { Router } from "express";
import { getRessources } from "./ressource.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.get("/", getRessources);

export default router;
