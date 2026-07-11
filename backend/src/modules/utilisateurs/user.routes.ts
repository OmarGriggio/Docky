import { Router } from "express";
import { getAllUsersController, createUserController } from "./user.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";


const router = Router();

router.get("/", authenticate, getAllUsersController);

router.post("/", createUserController)

export default router;