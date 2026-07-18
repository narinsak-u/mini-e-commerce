import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { registerUser } from "../../application/auth/use-cases/register";
import { loginUser } from "../../application/auth/use-cases/login";
import { refreshToken } from "../../application/auth/use-cases/refresh-token";
import { logoutUser } from "../../application/auth/use-cases/logout";

/** Handles auth HTTP requests. */
export interface AuthController {
  /** POST /auth/register */
  register: ReturnType<typeof asyncHandler>;
  /** POST /auth/login */
  login: ReturnType<typeof asyncHandler>;
  /** POST /auth/refresh */
  refresh: ReturnType<typeof asyncHandler>;
  /** POST /auth/logout */
  logout: ReturnType<typeof asyncHandler>;
}

/** Factory: creates an AuthController wired to the given use cases. */
export function createAuthController(
  register: ReturnType<typeof registerUser>,
  login: ReturnType<typeof loginUser>,
  refresh: ReturnType<typeof refreshToken>,
  logout: ReturnType<typeof logoutUser>,
): AuthController {
  return {
    register: asyncHandler(async (req: Request, res: Response) => {
      const result = await register(req.body);
      res.status(201).json(result);
    }),
    login: asyncHandler(async (req: Request, res: Response) => {
      const result = await login(req.body);
      res.json(result);
    }),
    refresh: asyncHandler(async (req: Request, res: Response) => {
      const result = await refresh(req.body);
      res.json(result);
    }),
    logout: asyncHandler(async (req: Request, res: Response) => {
      const result = await logout(req.body);
      res.json(result);
    }),
  };
}
