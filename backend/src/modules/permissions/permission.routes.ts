import { Router } from "express";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { getEmployeePermissions, getMyPermissions, updateEmployeePermissions } from "./permission.controller";

// Paramètres > Droits des employés: the company's admin sets what its
// employees (USER) may do; anyone reads their own.
const router = Router();

router.use(authenticate);

router.get("/me", getMyPermissions);
router.get("/employees", requireRole("ADMIN", "PLATFORM_ADMIN"), getEmployeePermissions);
router.put("/employees", requireRole("ADMIN", "PLATFORM_ADMIN"), updateEmployeePermissions);

export default router;
