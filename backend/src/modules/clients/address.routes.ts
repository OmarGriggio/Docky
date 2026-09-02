import { Router } from "express";
import { createAddress, deleteAddress, getAddresses } from "./address.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getAddresses);

router.post("/", createAddress);

router.delete("/:id", deleteAddress);

export default router;
