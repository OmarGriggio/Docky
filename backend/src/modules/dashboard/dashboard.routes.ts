import { Router } from "express";
import { getPaidAmountByClient } from "./dashboard.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/paid-by-client", getPaidAmountByClient);

export default router;
