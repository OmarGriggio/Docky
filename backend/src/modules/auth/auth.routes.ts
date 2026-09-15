import { Router } from "express";
import { authUserController, refreshTokenController, logoutController, impersonateCompanyController } from "./auth.controller";
import { loginRateLimiter } from "../../shared/middlewares/rate-limit.middleware";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";

const router = Router();

router.post("/login", loginRateLimiter, authUserController);

router.post("/refresh", refreshTokenController);

router.post("/logout", logoutController);

router.post("/impersonate/:companyId", authenticate, requireRole("PLATFORM_ADMIN"), impersonateCompanyController);

export default router;
