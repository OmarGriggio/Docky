import { Request, Response } from "express";
import { authUserService, refreshAccessTokenServ, logoutServ } from "./auth.service";
import { LoginUserData } from "../users/user.types";

export const authUserController = async (req: Request, res: Response) => {
    const loginData: LoginUserData = req.body
    const resp = await authUserService(loginData);
    res.json(resp);
};

export const refreshTokenController = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const resp = await refreshAccessTokenServ(refreshToken);
    res.json(resp);
};

export const logoutController = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await logoutServ(refreshToken);
    res.status(204).send();
};
