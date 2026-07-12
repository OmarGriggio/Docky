import { Router } from "express";
import { getAllUsersController, createUserController, deleteUserController } from "./user.controller";
import { authenticate } from "../../shared/middlewares/auth.middleware";


const router = Router();

router.get("/", getAllUsersController);

router.post("/", createUserController);

router.delete("/:id", deleteUserController);

export default router;