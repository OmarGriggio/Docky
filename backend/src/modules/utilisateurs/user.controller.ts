import { Request, Response } from "express";
import { createUserService, getAllUsers } from "./user.service";
import { CreateUserData } from "./user.types";

export const getAllUsersController = async (req: Request, res: Response) => {
    const users = await getAllUsers();
    res.json(users);
}

export const createUserController = async (req: Request, res: Response) => {
    const userData : CreateUserData = req.body
    const userCreated = await createUserService(userData);
    res.json(userCreated);
};