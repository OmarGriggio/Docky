import { Router } from "express";
import { createAddress, updateAddress, deleteAddress, getAddresses } from "./address.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireAnyPermission, requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// Read wherever a client's address is picked or shown; changed with the
// clients module only.
router.get("/", requireAnyPermission(["clients", "quotes", "invoices", "projects"], "READ"), getAddresses);

router.post("/", requirePermission("clients", "WRITE"), createAddress);

router.put("/:id", requirePermission("clients", "WRITE"), updateAddress);

router.delete("/:id", requirePermission("clients", "WRITE"), deleteAddress);

export default router;
