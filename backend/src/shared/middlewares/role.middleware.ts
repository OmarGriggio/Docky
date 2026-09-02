import { Request, Response, NextFunction } from "express";
import { Role } from "../../modules/users/user.types";
import { ForbiddenError } from "../types/errors";

// Use after `authenticate`. Rejects unless req.user.role is one of `roles`.
export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError();
    }
    next();
  };
};
