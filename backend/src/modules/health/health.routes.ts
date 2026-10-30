import { Router } from "express";
import { getHealth } from "./health.controller";

const router = Router();

// No authenticate on purpose: an external uptime monitor calls it without a
// token. It reveals nothing but whether the database and storage answer.
router.get("/", getHealth);

export default router;
