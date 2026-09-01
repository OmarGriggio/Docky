import { Router } from "express";
import { createClient, archiveClient, unarchiveClient, getClient, getClients } from "./client.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getClients);

router.get("/:id", getClient);

router.post("/", createClient);

router.patch("/:id/archive", archiveClient);

router.patch("/:id/unarchive", unarchiveClient);

export default router;
