import { Router } from "express";
import { createEntreprise, getEntreprise, getEntreprises, updateEntreprise, uploadEntrepriseLogo } from "./entreprise.controller";
import { uploadLogo } from "./entreprise.upload";

const router = Router();

router.get("/", getEntreprises);
router.get("/:id", getEntreprise);
router.post("/", createEntreprise);
router.put("/:id", updateEntreprise);
router.post("/:id/logo", uploadLogo, uploadEntrepriseLogo);

export default router;
