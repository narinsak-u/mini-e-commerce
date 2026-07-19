/** Auth router: wires use cases and controller into Express routes. */
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201:
 *         description: User registered
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/AuthResponse" }
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limited
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email + password
 *     responses:
 *       200:
 *         description: Logged in
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token
 *     responses:
 *       200:
 *         description: New token pair
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     responses:
 *       200:
 *         description: Logged out
 */
import { Router } from "express";
import { rateLimiter } from "../../infrastructure/redis/rate-limiter";
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

const loginLimiter = rateLimiter(60, 100);
const registerLimiter = rateLimiter(60, 100);

const router = Router();

router.post("/register", registerLimiter, authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

export default router;
