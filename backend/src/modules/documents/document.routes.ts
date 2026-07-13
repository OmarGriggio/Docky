import { Router } from "express";
import { createDocument, getDocuments } from "./document.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getDocuments);

router.post("/", createDocument);

export default router;
