import { Request, Response } from "express";
import { authUserService } from "./auth.service";
import { LoginUserData } from "../utilisateurs/user.types";

export const authUserController = async (req: Request, res: Response) => {
    const loginData: LoginUserData = req.body
    const resp = await authUserService(loginData);
    res.json(resp);
};