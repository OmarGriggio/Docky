import { Router } from "express";
import { getAllUsersController, createUserController, deleteUserController, updateUserLanguage } from "./user.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";


const router = Router();

// PLATFORM_ADMIN only, deliberately not (also) ADMIN - user management was
// centralized to the platform admin, see zz_docs/Decisions.md's "Cross-company
// access" entry. A PLATFORM_ADMIN manages a company's users the same way an
// ADMIN of that company used to: by impersonating it first (POST
// /auth/impersonate/:companyId) - company_id still comes from the token, see
// user.service.ts's createUserService.
router.get("/", authenticate, requireRole("PLATFORM_ADMIN"), getAllUsersController);

// No `authenticate` here on purpose — this route doubles as public company
// self-registration (no token exists yet at that point). See the comment in
// user.service.ts's createUserService for how the two flows are told apart and
// what each one is allowed to do.
router.post("/", createUserController);

router.delete("/:id", authenticate, requireRole("PLATFORM_ADMIN"), deleteUserController);

// Self-only, no :id - always the caller's own row (req.user.userId), open to
// any role. A personal preference, not the user management centralized to
// PLATFORM_ADMIN above.
router.patch("/language", authenticate, updateUserLanguage);

export default router;