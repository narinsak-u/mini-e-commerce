import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../../shared/errors/app-error";
import type { Role } from "../../shared/types";

export function rbacMiddleware(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    next();
  };
}
