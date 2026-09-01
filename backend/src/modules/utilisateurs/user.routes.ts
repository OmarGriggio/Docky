import { Router } from "express";
import { getAllUsersController, createUserController, deleteUserController } from "./user.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";


const router = Router();

router.get("/", authenticate, getAllUsersController);

// TODO (security): no `authenticate` here, and id_entreprise/role are taken straight
// from the request body (see CreateUserData / createUserController) — anyone can
// currently create a user, including an ADMIN, for any id_entreprise, with no login.
// This route is probably meant to double as "company self-registration" (create the
// first admin for a brand new company), which is why it can't just get `authenticate`
// slapped on it like the others. Needs a decision once the role system is designed:
//   - keep an unauthenticated path, but only for creating a brand-new company + its
//     first ADMIN (id_entreprise generated server-side, not client-supplied), or
//   - require authenticate + role === 'ADMIN', and force id_entreprise from
//     req.user.id_entreprise (an admin adding an employee to their own company).
// Left as-is for now (see conversation from 2026-09-01).
router.post("/", createUserController);

router.delete("/:id", authenticate, deleteUserController);

export default router;