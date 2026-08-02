import { Router } from "express";
import { createEntreprise, getEntreprise, getEntreprises, updateEntreprise } from "./entreprise.controller";

const router = Router();

router.get("/", getEntreprises);
router.get("/:id", getEntreprise);
router.post("/", createEntreprise);
router.put("/:id", updateEntreprise);

export default router;
