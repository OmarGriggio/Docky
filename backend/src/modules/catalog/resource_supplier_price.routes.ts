import { Router } from "express";
import { getResourceSupplierPrices } from "./resource_supplier_price.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getResourceSupplierPrices);

export default router;
