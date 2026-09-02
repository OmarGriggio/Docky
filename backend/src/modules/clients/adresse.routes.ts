import { Router } from "express";
import { createAdresse, deleteAdresse, getAdresses } from "./adresse.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getAdresses);

router.post("/", createAdresse);

router.delete("/:id", deleteAdresse);

export default router;
