import { Router } from "express";
import { createProjectType, deleteProjectType, getProjectTypes, getProjectTypeById } from "./project_type.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getProjectTypes);

router.get("/:id", getProjectTypeById);

// TODO (security): still open to any company - project_types is a global table,
// so a new label shows up in every company's picker. The frontend creates types
// inline from the project form/list, so this can't just be locked down like
// DELETE below - needs per-company types (company_id) to fix properly.
router.post("/", createProjectType);

// PLATFORM_ADMIN only: project_types is global, deleting one nulls
// project_type_id on every company's projects, not just the caller's. Nothing in
// the frontend deletes a type.
router.delete("/:id", requireRole("PLATFORM_ADMIN"), deleteProjectType);

export default router;
