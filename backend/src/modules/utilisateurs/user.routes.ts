import { Router } from "express";
import { getAllUsersController, createUserController, deleteUserController } from "./user.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";


const router = Router();

router.get("/", authenticate, getAllUsersController);

router.post("/", createUserController);

router.delete("/:id", authenticate, deleteUserController);

export default router;