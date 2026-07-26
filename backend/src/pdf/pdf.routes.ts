import { Router } from "express";
import { getFacturePdf } from "./pdf.controller";

const router = Router();

router.get("/facture/:id", getFacturePdf);

export default router;
