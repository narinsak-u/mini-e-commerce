/** Auth router: wires use cases and controller into Express routes. */
import { Router } from "express";
import { createDrizzleUserRepo } from "../../infrastructure/database/repositories/drizzle-user-repo";
import { createJwtService } from "../../infrastructure/auth/jwt-service";
import { createPasswordHasher } from "../../infrastructure/auth/password-hasher";
import { registerUser } from "../../application/auth/use-cases/register";
import { loginUser } from "../../application/auth/use-cases/login";
import { refreshToken } from "../../application/auth/use-cases/refresh-token";
import { logoutUser } from "../../application/auth/use-cases/logout";
import { createAuthController } from "../controllers/auth-controller";

const userRepo = createDrizzleUserRepo();
const jwtService = createJwtService();
const hasher = createPasswordHasher();

const register = registerUser(userRepo, hasher, jwtService);
const login = loginUser(userRepo, hasher, jwtService);
const refresh = refreshToken(userRepo, jwtService);
const logout = logoutUser();

const authController = createAuthController(register, login, refresh, logout);

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

export default router;
