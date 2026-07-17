import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { registerUser } from "../../application/auth/use-cases/register";
import { loginUser } from "../../application/auth/use-cases/login";
import { refreshToken } from "../../application/auth/use-cases/refresh-token";
import { logoutUser } from "../../application/auth/use-cases/logout";
import { ValidationError } from "../../shared/errors/app-error";

/** Handles auth HTTP requests. */
export interface AuthController {
  /** POST /auth/register. @throws ValidationError on Zod parse failure */
  register(req: Request, res: Response, next: NextFunction): Promise<void>;
  /** POST /auth/login. @throws ValidationError on Zod parse failure */
  login(req: Request, res: Response, next: NextFunction): Promise<void>;
  /** POST /auth/refresh. @throws ValidationError on Zod parse failure */
  refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
  /** POST /auth/logout. @throws ValidationError on Zod parse failure */
  logout(req: Request, res: Response, next: NextFunction): Promise<void>;
}

/** Factory: creates an AuthController wired to the given use cases. */
export function createAuthController(
  register: ReturnType<typeof registerUser>,
  login: ReturnType<typeof loginUser>,
  refresh: ReturnType<typeof refreshToken>,
  logout: ReturnType<typeof logoutUser>,
): AuthController {
  return {
    async register(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await register(req.body);
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map(e => e.message).join(", ")));
        }
        next(err);
      }
    },
    async login(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await login(req.body);
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map(e => e.message).join(", ")));
        }
        next(err);
      }
    },
    async refresh(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await refresh(req.body);
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map(e => e.message).join(", ")));
        }
        next(err);
      }
    },
    async logout(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await logout(req.body);
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map(e => e.message).join(", ")));
        }
        next(err);
      }
    },
  };
}
