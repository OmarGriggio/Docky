import { Router } from "express";
import { createEntreprise, getEntreprise, getEntreprises } from "./entreprise.controller";

const router = Router();

router.get("/", getEntreprises);
router.get("/:id", getEntreprise);
router.post("/", createEntreprise);

export default router;
