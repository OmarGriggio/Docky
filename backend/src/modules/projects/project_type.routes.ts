import { Router } from "express";
import { createProjectType, deleteProjectType, getProjectTypes, getProjectTypeById } from "./project_type.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireAnyPermission, requirePermission } from "../permissions/permission.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";

const router = Router();

router.use(authenticate);

router.get("/", requireAnyPermission(["projects", "dashboard", "calendar"], "READ"), getProjectTypes);

router.get("/:id", requireAnyPermission(["projects", "dashboard", "calendar"], "READ"), getProjectTypeById);

// TODO (security): still open to any company - project_types is a global table,
// so a new label shows up in every company's picker. The frontend creates types
// inline from the project form/list, so this can't just be locked down like
// DELETE below - needs per-company types (company_id) to fix properly.
router.post("/", requirePermission("projects", "WRITE"), createProjectType);

// PLATFORM_ADMIN only: project_types is global, deleting one nulls
// project_type_id on every company's projects, not just the caller's. Nothing in
// the frontend deletes a type.
router.delete("/:id", requireRole("PLATFORM_ADMIN"), deleteProjectType);

export default router;
