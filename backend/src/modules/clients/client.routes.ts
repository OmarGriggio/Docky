import express, { Router } from "express";
import { createClient, updateClient, archiveClient, unarchiveClient, getClient, getClients, importClients } from "./client.controller";
import { clientImportRateLimiter, clientImportWriteRateLimiter } from "../../shared/middlewares/rate-limit.middleware";
import { authenticate } from "../../shared/middlewares/auth.middleware";
import { requireAnyPermission, requirePermission } from "../permissions/permission.middleware";

const router = Router();

router.use(authenticate);

// Read wherever a client's name shows (a quote, an invoice, a chantier, the
// calendar); changed with the clients module only.
const readClients = requireAnyPermission(["clients", "quotes", "invoices", "projects", "calendar"], "READ");
const writeClients = requirePermission("clients", "WRITE");

router.get("/", readClients, getClients);

router.get("/:id", readClients, getClient);

router.post("/", writeClients, createClient);

// A spreadsheet of clients: rate-limited first, then its body read with a
// limit of its own (up to 1000 rows - app.ts's generic parser skips this
// route), only once the caller is known. A real import (not a dry run) has
// its own, lower limit on top.
router.post(
  "/import",
  writeClients,
  clientImportRateLimiter,
  (req, res, next) => (req.query.dryRun === "true" ? next() : clientImportWriteRateLimiter(req, res, next)),
  express.json({ limit: "2mb" }),
  importClients
);

router.put("/:id", writeClients, updateClient);

router.patch("/:id/archive", writeClients, archiveClient);

router.patch("/:id/unarchive", writeClients, unarchiveClient);

export default router;
