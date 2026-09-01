import { Router } from "express";
import { getFacturePdf } from "./pdf.controller";
import { authenticate } from "../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/facture/:id", getFacturePdf);

export default router;
