import jwt from "jsonwebtoken";
import { Role } from "../../modules/utilisateurs/user.types";

export type TokenPayload = { userId: number; email: string; role: Role; id_entreprise: number };

export const generateAccessToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "5h"
  });
};

export const generateRefreshToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: "7d"
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
};
