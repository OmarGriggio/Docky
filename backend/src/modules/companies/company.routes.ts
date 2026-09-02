import { Router, Request, Response, NextFunction } from "express";
import { createCompany, getCompany, getCompanies, updateCompany, uploadCompanyLogo } from "./company.controller";
import { uploadLogo } from "./company.upload";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { ForbiddenError } from "../../shared/types/errors";

const router = Router();

// Reading your own company's info is open to any role — viewing it isn't an admin
// action. Only a PLATFORM_ADMIN can read a company that isn't their own.
const requireOwnCompanyOrPlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role === "PLATFORM_ADMIN" || req.user.company_id === Number(req.params.id)) {
    return next();
  }
  throw new ForbiddenError();
};

// Editing a company's info (or its logo) requires being that company's own ADMIN —
// an ordinary USER of the company can't, even for their own company.
const requireCompanyAdminOrPlatformAdmin = (req: Request, res: Response, next: NextFunction) => {
  const isOwnCompanyAdmin = req.user.role === "ADMIN" && req.user.company_id === Number(req.params.id);
  if (req.user.role === "PLATFORM_ADMIN" || isOwnCompanyAdmin) {
    return next();
  }
  throw new ForbiddenError();
};

router.get("/", authenticate, requireRole("PLATFORM_ADMIN"), getCompanies);
router.get("/:id", authenticate, requireOwnCompanyOrPlatformAdmin, getCompany);
// No `authenticate` here on purpose — this is public company self-registration.
router.post("/", createCompany);
router.put("/:id", authenticate, requireCompanyAdminOrPlatformAdmin, updateCompany);
router.post("/:id/logo", authenticate, requireCompanyAdminOrPlatformAdmin, uploadLogo, uploadCompanyLogo);

export default router;
