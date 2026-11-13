import express, { Router } from "express";
import { createClient, updateClient, archiveClient, unarchiveClient, getClient, getClients, importClients } from "./client.controller";
import { clientImportRateLimiter, clientImportWriteRateLimiter } from "../../shared/middlewares/rate-limit.middleware";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getClients);

router.get("/:id", getClient);

router.post("/", createClient);

// A spreadsheet of clients: rate-limited first, then its body read with a
// limit of its own (up to 1000 rows - app.ts's generic parser skips this
// route), only once the caller is known. A real import (not a dry run) has
// its own, lower limit on top.
router.post(
  "/import",
  clientImportRateLimiter,
  (req, res, next) => (req.query.dryRun === "true" ? next() : clientImportWriteRateLimiter(req, res, next)),
  express.json({ limit: "2mb" }),
  importClients
);

router.put("/:id", updateClient);

router.patch("/:id/archive", archiveClient);

router.patch("/:id/unarchive", unarchiveClient);

export default router;
