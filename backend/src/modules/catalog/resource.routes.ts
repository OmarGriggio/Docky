import { Router } from "express";
import { getResources, createResource, updateResource, archiveResource, unarchiveResource } from "./resource.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireAnyPermission, requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// Read by the catalog and by the quote, invoice and chantier forms' pickers;
// changed with the catalog module only.
const writeCatalog = requirePermission("catalog", "WRITE");

router.get("/", requireAnyPermission(["catalog", "quotes", "invoices", "projects"], "READ"), getResources);

router.post("/", writeCatalog, createResource);

router.put("/:id", writeCatalog, updateResource);

router.patch("/:id/archive", writeCatalog, archiveResource);

router.patch("/:id/unarchive", writeCatalog, unarchiveResource);

export default router;
