import { Router } from "express";
import { authUserController } from "./auth.controller";

const router = Router();

router.post("/", authUserController);

export default router;