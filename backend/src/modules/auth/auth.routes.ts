import { Router } from "express";
import { authUserController } from "./auth.controller";
import { loginRateLimiter } from "../../shared/middlewares/rate-limit.middleware";

const router = Router();

router.post("/", loginRateLimiter, authUserController);

export default router;