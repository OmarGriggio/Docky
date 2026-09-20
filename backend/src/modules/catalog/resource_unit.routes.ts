import { Router } from "express";
import { getUnits, createUnit } from "./resource_unit.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getUnits);

router.post("/", createUnit);

export default router;
