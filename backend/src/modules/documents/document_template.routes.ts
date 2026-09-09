import { Router } from "express";
import { getDocumentTemplate, upsertDocumentTemplate } from "./document_template.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getDocumentTemplate);

router.put("/:type", upsertDocumentTemplate);

export default router;
