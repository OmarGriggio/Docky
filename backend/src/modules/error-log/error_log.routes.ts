import { Router } from "express";
import { getErrorGroups, recordClientError, reopenErrorGroup, resolveErrorGroup } from "./error_log.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { clientErrorGlobalRateLimiter, clientErrorRateLimiter } from "../../shared/middlewares/rate-limit.middleware";

const router = Router();

// Any logged-in user's browser reports what it ran into - not public, so
// nobody can fill the table without an account, and rate-limited per user
// and overall.
router.post("/client", authenticate, clientErrorRateLimiter, clientErrorGlobalRateLimiter, recordClientError);

// Reading and resolving: PLATFORM_ADMIN only, deliberately not ADMIN - the
// list spans every company (same reasoning as login_history.routes.ts).
router.get("/", authenticate, requireRole("PLATFORM_ADMIN"), getErrorGroups);
router.patch("/:id/resolve", authenticate, requireRole("PLATFORM_ADMIN"), resolveErrorGroup);
router.patch("/:id/reopen", authenticate, requireRole("PLATFORM_ADMIN"), reopenErrorGroup);

export default router;
