import { Router } from "express";
import { createClient, updateClient, archiveClient, unarchiveClient, getClient, getClients, importClients } from "./client.controller";
import { clientImportRateLimiter } from "../../shared/middlewares/rate-limit.middleware";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getClients);

router.get("/:id", getClient);

router.post("/", createClient);

// A spreadsheet of clients - its body may be large, see app.ts.
router.post("/import", clientImportRateLimiter, importClients);

router.put("/:id", updateClient);

router.patch("/:id/archive", archiveClient);

router.patch("/:id/unarchive", unarchiveClient);

export default router;
