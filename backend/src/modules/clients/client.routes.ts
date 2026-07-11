import { Router } from "express";
import { createClient, deleteClient, getClient, getClients } from "../controllers/client.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", getClients);

router.get("/:id", getClient);

router.post("/", createClient);

router.delete("/", deleteClient);

export default router;
