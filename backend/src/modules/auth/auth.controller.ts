import { Request, Response } from "express";
import { authUserService, refreshAccessTokenServ, logoutServ } from "./auth.service";
import { LoginUserData } from "../users/user.types";
import { REFRESH_TOKEN_TTL_MS } from "../../shared/middlewares/jwt.service";

const REFRESH_TOKEN_COOKIE = "docky_refresh_token";

// httpOnly so front-end JS can never read it (mitigates XSS stealing it);
// SameSite=Lax as a first CSRF mitigation (see zz_docs/Decisions.md for why
// not Strict). secure is off for now - the app has no HTTPS/domain yet (see
// CLAUDE.md's "Known gaps"), and a Secure cookie is silently dropped by the
// browser over plain HTTP. Flip to true once TLS is in place.
const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/",
};

export const authUserController = async (req: Request, res: Response) => {
    const loginData: LoginUserData = req.body
    const { token, refreshToken } = await authUserService(loginData);
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
        ...REFRESH_TOKEN_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_TTL_MS,
    });
    res.json({ token });
};

export const refreshTokenController = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    const resp = await refreshAccessTokenServ(refreshToken);
    res.json(resp);
};

export const logoutController = async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    await logoutServ(refreshToken);
    res.clearCookie(REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_OPTIONS);
    res.status(204).send();
};
