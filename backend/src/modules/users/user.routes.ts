import { Router } from "express";
import { getAllUsersController, createUserController, deleteUserController } from "./user.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";


const router = Router();

router.get("/", authenticate, requireRole("ADMIN"), getAllUsersController);

// No `authenticate` here on purpose — this route doubles as public company
// self-registration (no token exists yet at that point). See the comment in
// user.service.ts's createUserService for how the two flows are told apart and
// what each one is allowed to do.
router.post("/", createUserController);

router.delete("/:id", authenticate, requireRole("ADMIN"), deleteUserController);

export default router;