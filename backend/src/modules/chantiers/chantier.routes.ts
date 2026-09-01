import { Router } from "express";
import { createChantier, deleteChantier, getChantiers } from "./chantier.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getChantiers);

router.post("/", createChantier);

router.delete("/:id", deleteChantier);

export default router;
