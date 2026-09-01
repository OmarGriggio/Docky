import { Router } from "express";
import { createEntreprise, getEntreprise, getEntreprises, updateEntreprise, uploadEntrepriseLogo } from "./entreprise.controller";
import { uploadLogo } from "./entreprise.upload";

const router = Router();

// TODO (security): none of these routes require `authenticate` yet, and there's no
// platform-admin role to check even if they did (the `role` on the JWT is only
// 'ADMIN' | 'UTILISATEUR', i.e. company-level — see user.types.ts). Right now
// GET / leaks every company on the SaaS, and GET/PUT /:id + POST /:id/logo let
// anyone read or overwrite any company's data with no login at all.
// Once a platform-admin role exists:
//   - GET /        -> platform-admin only (lists every company)
//   - GET/PUT /:id -> platform-admin OR a user whose own id_entreprise === :id
//   - POST /       -> stays open (this is company self-registration)
//   - POST /:id/logo -> same rule as GET/PUT /:id
// Left as-is for now (see conversation from 2026-09-01) — not fixing until the
// role system is designed.
router.get("/", getEntreprises);
router.get("/:id", getEntreprise);
router.post("/", createEntreprise);
router.put("/:id", updateEntreprise);
router.post("/:id/logo", uploadLogo, uploadEntrepriseLogo);

export default router;
