import { Router } from "express";
import { getLoginHistory, getLoginHistoryUsers } from "./login_history.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";

const router = Router();

// PLATFORM_ADMIN only, deliberately not ADMIN - this spans every company's
// own users, not just the caller's own (see login_history.repository.ts).
router.get("/", authenticate, requireRole("PLATFORM_ADMIN"), getLoginHistory);
router.get("/users", authenticate, requireRole("PLATFORM_ADMIN"), getLoginHistoryUsers);

export default router;
