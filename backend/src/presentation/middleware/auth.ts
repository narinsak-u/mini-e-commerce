import type { Request, Response, NextFunction } from "express";
import { createJwtService } from "../../infrastructure/auth/jwt-service";
import { UnauthorizedError } from "../../shared/errors/app-error";

const jwtService = createJwtService();

declare module "express-serve-static-core" {
  interface Request {
    user?: { sub: string; role: string };
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new UnauthorizedError("Missing or invalid token");

  const token = header.slice(7);
  try {
    req.user = jwtService.verify(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}
