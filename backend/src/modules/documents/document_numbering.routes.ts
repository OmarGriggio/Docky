import { Router } from "express";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireRole } from "../../shared/middlewares/role.middleware";
import { getNumbering, previewNumbering, updateNumbering } from "./document_numbering.controller";

// Paramètres > Numérotation. Reading and previewing are open to the
// company's users; changing how its documents are numbered is its admin's
// (like the company's profile).
const router = Router();

router.use(authenticate);

router.get("/", getNumbering);
router.post("/:type/preview", previewNumbering);
router.put("/:type", requireRole("ADMIN", "PLATFORM_ADMIN"), updateNumbering);

export default router;
