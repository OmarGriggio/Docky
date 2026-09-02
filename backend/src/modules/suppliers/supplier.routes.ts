import { Router } from "express";
import { createSupplier, archiveSupplier, unarchiveSupplier, getSuppliers, getSupplierById } from "./supplier.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getSuppliers);

router.get("/:id", getSupplierById);

router.post("/", createSupplier);

router.patch("/:id/archive", archiveSupplier);

router.patch("/:id/unarchive", unarchiveSupplier);

export default router;
