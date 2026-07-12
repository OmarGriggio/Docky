import { Router } from "express";
import { createChantier, deleteChantier, getChantiers } from "./chantier.controller";

const router = Router();

router.get("/", getChantiers);

router.post("/", createChantier);

router.delete("/:id", deleteChantier);

export default router;
