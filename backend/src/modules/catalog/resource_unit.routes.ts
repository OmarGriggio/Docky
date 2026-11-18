import { Router } from "express";
import { getUnits, createUnit, archiveUnit } from "./resource_unit.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireAnyPermission, requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

router.get("/", requireAnyPermission(["catalog", "quotes", "invoices", "projects"], "READ"), getUnits);

router.post("/", requirePermission("catalog", "WRITE"), createUnit);

router.patch("/:id/archive", requirePermission("catalog", "WRITE"), archiveUnit);

export default router;
