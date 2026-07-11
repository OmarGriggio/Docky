import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt.service";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "Authorization header missing"
    });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    verifyToken(token);

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid token"
    });
  }
};