import { Router } from "express";
import { getLines, createLine, archiveLine, unarchiveLine } from "./document_line.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getLines);

router.post("/", createLine);

router.patch("/:id/archive", archiveLine);

router.patch("/:id/unarchive", unarchiveLine);

export default router;
