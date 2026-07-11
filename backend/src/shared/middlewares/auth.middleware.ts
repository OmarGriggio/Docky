import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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
    jwt.verify(token, process.env.JWT_SECRET!);

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid token"
    });
  }
};