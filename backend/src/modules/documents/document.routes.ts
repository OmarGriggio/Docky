import { Router } from "express";
import { createDocument, getDocuments } from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getDocuments);

router.post("/", createDocument);

export default router;
