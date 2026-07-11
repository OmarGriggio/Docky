import { Request, Response } from "express";
import { authUserService } from "../services/auth.service";
import { LoginUserData } from "../types/user";

export const authUserController = async (req: Request, res: Response) => {
    const loginData: LoginUserData = req.body
    const resp = await authUserService(loginData);
    res.json(resp);
};