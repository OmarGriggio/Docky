import { Router, Request, Response, NextFunction } from "express";
import { createEntreprise, getEntreprise, getEntreprises, updateEntreprise, uploadEntrepriseLogo } from "./entreprise.controller";
import { uploadLogo } from "./entreprise.upload";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { ForbiddenError } from "../../shared/types/errors";

const router = Router();

// Reading your own company's info is open to any role — viewing it isn't an admin
// action. Only an ADMIN_PLATEFORME can read a company that isn't their own.
const requireOwnEntrepriseOrPlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role === "ADMIN_PLATEFORME" || req.user.id_entreprise === Number(req.params.id)) {
    return next();
  }
  throw new ForbiddenError();
};

// Editing a company's info (or its logo) requires being that company's own ADMIN —
// an ordinary UTILISATEUR of the company can't, even for their own company.
const requireEntrepriseAdminOrPlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  const isOwnCompanyAdmin = req.user.role === "ADMIN" && req.user.id_entreprise === Number(req.params.id);
  if (req.user.role === "ADMIN_PLATEFORME" || isOwnCompanyAdmin) {
    return next();
  }
  throw new ForbiddenError();
};

router.get("/", authenticate, requireRole("ADMIN_PLATEFORME"), getEntreprises);
router.get("/:id", authenticate, requireOwnEntrepriseOrPlatformAdmin, getEntreprise);
// No `authenticate` here on purpose — this is public company self-registration.
router.post("/", createEntreprise);
router.put("/:id", authenticate, requireEntrepriseAdminOrPlatformAdmin, updateEntreprise);
router.post("/:id/logo", authenticate, requireEntrepriseAdminOrPlatformAdmin, uploadLogo, uploadEntrepriseLogo);

export default router;
