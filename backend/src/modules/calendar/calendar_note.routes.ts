import { Router } from "express";
import { getNotes, createNote, updateNote, deleteNote } from "./calendar_note.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("calendar", "READ"), getNotes);

router.post("/", requirePermission("calendar", "WRITE"), createNote);

router.put("/:id", requirePermission("calendar", "WRITE"), updateNote);

router.delete("/:id", requirePermission("calendar", "WRITE"), deleteNote);

export default router;
