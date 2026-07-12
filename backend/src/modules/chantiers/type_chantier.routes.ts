import { Router } from "express";
import { createTypeChantier, deleteTypeChantier, getTypesChantier } from "./type_chantier.controller";

const router = Router();

router.get("/", getTypesChantier);

router.post("/", createTypeChantier);

router.delete("/:id", deleteTypeChantier);

export default router;
