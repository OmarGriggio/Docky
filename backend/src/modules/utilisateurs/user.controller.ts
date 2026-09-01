import { Request, Response } from "express";
import { createUserService, deleteUserService, getAllUsers } from "./user.service";
import { CreateUserData } from "./user.types";
import { verifyToken } from "../../shared/middlewares/jwt.service";
import { UnauthorizedError } from "../../shared/types/errors";

export const getAllUsersController = async (req: Request, res: Response) => {
    const users = await getAllUsers(req.user.id_entreprise);
    res.json(users);
}

export const deleteUserController = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userDeleted = await deleteUserService(id, req.user.id_entreprise);
    res.json(userDeleted);
};

export const createUserController = async (req: Request, res: Response) => {
    const userData : CreateUserData = req.body

    // No `authenticate` on this route — it doubles as public self-registration.
    // If a token is present, verify it and let createUserService decide what it's
    // allowed to do with it (see the comment there).
    const authHeader = req.headers.authorization;
    let actor = null;
    if (authHeader) {
      try {
        actor = verifyToken(authHeader.replace("Bearer ", ""));
      } catch {
        throw new UnauthorizedError("Invalid token");
      }
    }

    const userCreated = await createUserService(userData, actor);
    res.json(userCreated);
};