import { Router } from "express";
import { createTypeChantier, deleteTypeChantier, getTypesChantier } from "./type_chantier.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getTypesChantier);

router.post("/", createTypeChantier);

router.delete("/:id", deleteTypeChantier);

export default router;
