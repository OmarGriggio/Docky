import { Router } from "express";
import { getAllUsersController, createUserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";


const router = Router();

router.get("/", authenticate, getAllUsersController);

router.post("/", createUserController)

export default router;