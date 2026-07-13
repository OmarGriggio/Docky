import { Request, Response } from "express";
import { createUserService, deleteUserService, getAllUsers } from "./user.service";
import { CreateUserData } from "./user.types";

export const getAllUsersController = async (req: Request, res: Response) => {
    const users = await getAllUsers(req.user.id_entreprise);
    res.json(users);
}

export const deleteUserController = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userDeleted = await deleteUserService(id);
    res.json(userDeleted);
};

export const createUserController = async (req: Request, res: Response) => {
    const userData : CreateUserData = req.body
    const userCreated = await createUserService(userData);
    res.json(userCreated);
};