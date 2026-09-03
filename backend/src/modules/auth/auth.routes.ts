import { Router } from "express";
import { authUserController, refreshTokenController, logoutController } from "./auth.controller";
import { loginRateLimiter } from "../../shared/middlewares/rate-limit.middleware";

const router = Router();

router.post("/login", loginRateLimiter, authUserController);

router.post("/refresh", refreshTokenController);

router.post("/logout", logoutController);

export default router;
