# Phase 2: Authentication Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete JWT-based authentication system with register, login, refresh token, and logout flows, plus auth and RBAC middleware.

**Architecture:** Domain entity (User) with repository interface → Application layer with use cases (RegisterUser, LoginUser, RefreshToken, LogoutUser) and service interfaces (JwtService, PasswordHasher) → Infrastructure implementations (Drizzle, jsonwebtoken, bcryptjs) → Presentation (controller, routes, middleware). Clean Architecture boundaries enforced throughout.

**Tech Stack:** Express.js, TypeScript, jsonwebtoken, bcryptjs, Zod, Drizzle ORM, PostgreSQL

---

### Task 1: Create User domain entity and repository interface

**Files:**
- Create: `backend/src/domain/auth/entities/user.ts`
- Create: `backend/src/domain/auth/repositories/user-repository.ts`

- [ ] **Step 1: Create User entity with static create() factory**

```typescript
// backend/src/domain/auth/entities/user.ts
import type { Role } from "../../../shared/types";

/** A registered user in the system. */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

/** Creates a User with default timestamps and role. @param props.id - UUID, @param props.role - defaults to "customer" */
export function createUser(props: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role?: Role;
}): User {
  return {
    id: props.id,
    email: props.email,
    passwordHash: props.passwordHash,
    name: props.name,
    role: props.role ?? "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

- [ ] **Step 2: Create IUserRepository interface**

```typescript
// backend/src/domain/auth/repositories/user-repository.ts
import type { User } from "../entities/user";

/** Repository interface for User persistence. */
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}
```

- [ ] **Step 3: Create directory and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\auth\entities" -Force
New-Item -ItemType Directory -Path "$root\domain\auth\repositories" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/auth/
git commit -m "feat(backend): add User entity and repository interface"
```

---

### Task 2: Create application layer interfaces

**Files:**
- Create: `backend/src/application/auth/interfaces/jwt-service.ts`
- Create: `backend/src/application/auth/interfaces/password-hasher.ts`

- [ ] **Step 1: Create IJwtService interface**

```typescript
// backend/src/application/auth/interfaces/jwt-service.ts
/** Payload contained in JWT tokens. */
export interface TokenPayload {
  sub: string;
  role: string;
}

/** Service interface for JWT signing and verification. */
export interface IJwtService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
```

- [ ] **Step 2: Create IPasswordHasher interface**

```typescript
// backend/src/application/auth/interfaces/password-hasher.ts
/** Service interface for password hashing and comparison. */
export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
```

- [ ] **Step 3: Commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\application\auth\interfaces" -Force
cd D:\Github\mini-e-commerce
git add backend/src/application/auth/interfaces/
git commit -m "feat(backend): add JWT and password hasher service interfaces"
```

---

### Task 3: Create infrastructure implementations

**Files:**
- Create: `backend/src/infrastructure/auth/jwt-service.ts`
- Create: `backend/src/infrastructure/auth/password-hasher.ts`
- Create: `backend/src/infrastructure/database/repositories/drizzle-user-repo.ts`

- [ ] **Step 1: Create JwtService implementation**

```typescript
// backend/src/infrastructure/auth/jwt-service.ts
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import type { IJwtService, TokenPayload } from "../../application/auth/interfaces/jwt-service";

/** Creates an IJwtService backed by jsonwebtoken. */
export function createJwtService(): IJwtService {
  return {
    /** Signs a short-lived access token. */
    signAccessToken(payload: TokenPayload): string {
      return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
    },
    /** Signs a long-lived refresh token. */
    signRefreshToken(payload: TokenPayload): string {
      return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtRefreshExpiresIn });
    },
    /** Verifies a token and returns its payload. @throws if token is invalid/expired */
    verify(token: string): TokenPayload {
      return jwt.verify(token, env.jwtSecret) as TokenPayload;
    },
  };
}
```

- [ ] **Step 2: Create PasswordHasher implementation**

```typescript
// backend/src/infrastructure/auth/password-hasher.ts
import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../../application/auth/interfaces/password-hasher";

/** Creates an IPasswordHasher backed by bcryptjs with 12 salt rounds. */
export function createPasswordHasher(): IPasswordHasher {
  return {
    /** Hashes a plaintext password. */
    async hash(password: string): Promise<string> {
      return bcrypt.hash(password, 12);
    },
    /** Compares a plaintext password against a hash. */
    async compare(password: string, hash: string): Promise<boolean> {
      return bcrypt.compare(password, hash);
    },
  };
}
```

- [ ] **Step 3: Create DrizzleUserRepository implementation**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-user-repo.ts
import { eq } from "drizzle-orm";
import { db } from "../../../config/database";
import { users } from "../drizzle/schema/users";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { User } from "../../../domain/auth/entities/user";

/** Creates an IUserRepository backed by Drizzle ORM. */
export function createDrizzleUserRepo(): IUserRepository {
  return {
    /** Finds a user by email. @returns User or null if not found. */
    async findByEmail(email: string): Promise<User | null> {
      const row = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!row[0]) return null;
      return rowToUser(row[0]);
    },
    /** Finds a user by ID. @returns User or null if not found. */
    async findById(id: string): Promise<User | null> {
      const row = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!row[0]) return null;
      return rowToUser(row[0]);
    },
    /** Inserts a new user record. */
    async save(user: User): Promise<void> {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    },
  };
}

/** Maps a Drizzle user row to a domain User entity. */
function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 4: Create infra directories and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\infrastructure\auth" -Force
New-Item -ItemType Directory -Path "$root\infrastructure\database\repositories" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/auth/ backend/src/infrastructure/database/repositories/drizzle-user-repo.ts
git commit -m "feat(backend): add JWT, password hasher, and Drizzle user repo implementations"
```

---

### Task 4: Create auth use cases

**Files:**
- Create: `backend/src/application/auth/use-cases/register.ts`
- Create: `backend/src/application/auth/use-cases/login.ts`
- Create: `backend/src/application/auth/use-cases/refresh-token.ts`
- Create: `backend/src/application/auth/use-cases/logout.ts`

- [ ] **Step 1: Create RegisterUser use case**

```typescript
// backend/src/application/auth/use-cases/register.ts
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createUser } from "../../../domain/auth/entities/user";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { IJwtService } from "../interfaces/jwt-service";
import type { IPasswordHasher } from "../interfaces/password-hasher";
import { ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(6).max(255),
});

/** Use case factory: registers a new user. @throws ValidationError if email exists */
export function registerUser(userRepo: IUserRepository, hasher: IPasswordHasher, jwt: IJwtService) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const existing = await userRepo.findByEmail(data.email);
    if (existing) throw new ValidationError("Email already in use");

    const passwordHash = await hasher.hash(data.password);
    const user = createUser({
      id: randomUUID(),
      email: data.email,
      passwordHash,
      name: data.name,
    });

    await userRepo.save(user);

    const accessToken = jwt.signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = jwt.signRefreshToken({ sub: user.id, role: user.role });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    };
  };
}
```

- [ ] **Step 2: Create LoginUser use case**

```typescript
// backend/src/application/auth/use-cases/login.ts
import { z } from "zod";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { IJwtService } from "../interfaces/jwt-service";
import type { IPasswordHasher } from "../interfaces/password-hasher";
import { UnauthorizedError } from "../../../shared/errors/app-error";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Use case factory: authenticates a user and returns tokens. @throws UnauthorizedError if credentials are invalid */
export function loginUser(userRepo: IUserRepository, hasher: IPasswordHasher, jwt: IJwtService) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const user = await userRepo.findByEmail(data.email);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const valid = await hasher.compare(data.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const accessToken = jwt.signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = jwt.signRefreshToken({ sub: user.id, role: user.role });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    };
  };
}
```

- [ ] **Step 3: Create RefreshToken use case**

```typescript
// backend/src/application/auth/use-cases/refresh-token.ts
import { z } from "zod";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { IJwtService } from "../interfaces/jwt-service";
import { UnauthorizedError } from "../../../shared/errors/app-error";

const schema = z.object({
  refreshToken: z.string().min(1),
});

/** Use case factory: issues new tokens from a valid refresh token. @throws UnauthorizedError if token invalid or user missing */
export function refreshToken(userRepo: IUserRepository, jwt: IJwtService) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    let payload;
    try {
      payload = jwt.verify(data.refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await userRepo.findById(payload.sub);
    if (!user) throw new UnauthorizedError("User not found");

    const accessToken = jwt.signAccessToken({ sub: user.id, role: user.role });
    const newRefreshToken = jwt.signRefreshToken({ sub: user.id, role: user.role });

    return { accessToken, refreshToken: newRefreshToken };
  };
}
```

- [ ] **Step 4: Create LogoutUser use case**

```typescript
// backend/src/application/auth/use-cases/logout.ts
// ponytail: skip refresh token persistence, add when refresh logout is needed
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string().min(1),
});

/** Use case factory: logs out (validates input, no-op on server). */
export function logoutUser() {
  return async (input: z.infer<typeof schema>) => {
    schema.parse(input);
    return { message: "Logged out successfully" };
  };
}
```

- [ ] **Step 5: Create use-cases directory and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\application\auth\use-cases" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/auth/use-cases/
git commit -m "feat(backend): add auth use cases (register, login, refresh, logout)"
```

---

### Task 5: Create auth and RBAC middleware

**Files:**
- Create: `backend/src/presentation/middleware/auth.ts`
- Create: `backend/src/presentation/middleware/rbac.ts`

- [ ] **Step 1: Create auth middleware**

```typescript
// backend/src/presentation/middleware/auth.ts
import type { Request, Response, NextFunction } from "express";
import { createJwtService } from "../../infrastructure/auth/jwt-service";
import { UnauthorizedError } from "../../shared/errors/app-error";

const jwtService = createJwtService();

declare module "express-serve-static-core" {
  interface Request {
    user?: { sub: string; role: string };
  }
}

/** Express middleware: extracts and verifies a Bearer JWT, sets req.user. @throws UnauthorizedError if missing or invalid */
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
```

- [ ] **Step 2: Create RBAC middleware**

```typescript
// backend/src/presentation/middleware/rbac.ts
import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../../shared/errors/app-error";
import type { Role } from "../../shared/types";

/** Express middleware factory: restricts access to specified roles. @throws ForbiddenError if user lacks required role */
export function rbacMiddleware(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
    next();
  };
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/middleware/auth.ts backend/src/presentation/middleware/rbac.ts
git commit -m "feat(backend): add auth and RBAC middleware"
```

---

### Task 6: Create auth controller and routes

**Files:**
- Create: `backend/src/presentation/controllers/auth-controller.ts`
- Create: `backend/src/presentation/routes/auth.ts`

- [ ] **Step 1: Create AuthController**

```typescript
// backend/src/presentation/controllers/auth-controller.ts
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
```

- [ ] **Step 2: Create auth routes**

```typescript
// backend/src/presentation/routes/auth.ts
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
```

- [ ] **Step 3: Create controller/routes directories and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\presentation\controllers" -Force
New-Item -ItemType Directory -Path "$root\presentation\routes" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/auth-controller.ts backend/src/presentation/routes/auth.ts
git commit -m "feat(backend): add auth controller and routes"
```

---

### Task 7: Wire auth routes into the Express app

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update index.ts to mount auth routes**

```typescript
// backend/src/index.ts
/** Express app entry point: mounts middleware, health check, auth routes, and error handler. */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { errorHandler } from "./presentation/middleware/error-handler";
import authRoutes from "./presentation/routes/auth";

const app = express();

app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(compression());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 2: Start server and verify auth endpoints**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3000.

Run: `curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Test\",\"email\":\"test@example.com\",\"password\":\"password123\"}"`
Expected: `{ "user": { "id": "...", "email": "test@example.com", "name": "Test", "role": "customer" }, "accessToken": "...", "refreshToken": "..." }`

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/index.ts
git commit -m "feat(backend): wire auth routes into Express app"
```

---

### Task 8: Write auth integration tests

**Files:**
- Create: `backend/src/tests/auth.test.ts`

- [ ] **Step 1: Create auth test file**

```typescript
// backend/src/tests/auth.test.ts
/** Integration tests for the full auth flow. */
import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { users } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";

const testEmail = `test-${randomUUID()}@example.com`;
const testPassword = "password123";
const testName = "Test User";
let accessToken = "";
let refreshTokenValue = "";

afterAll(async () => {
  await db.delete(users).where(eq(users.email, testEmail));
});

describe("Auth API", () => {
  it("registers a new user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: testName, email: testEmail, password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.name).toBe(testName);
    expect(res.body.user.role).toBe("customer");
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    accessToken = res.body.accessToken;
    refreshTokenValue = res.body.refreshToken;
  });

  it("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: testName, email: testEmail, password: testPassword });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Email already in use");
  });

  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it("rejects login with wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: testEmail, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("refreshes token with valid refresh token", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: refreshTokenValue });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
  });

  it("rejects refresh with invalid token", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid refresh token");
  });

  it("logs out successfully", async () => {
    const res = await request(app)
      .post("/auth/logout")
      .send({ refreshToken: refreshTokenValue });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out successfully");
  });

  it("rejects register with invalid email", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Bad", email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
  });

  it("rejects register with short password", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Bad", email: `bad-${randomUUID()}@example.com`, password: "12345" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: 9 tests pass (health, database, and 7 auth tests).

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/auth.test.ts
git commit -m "feat(backend): add auth integration tests"
```

---

## Acceptance Criteria
- [ ] POST /auth/register creates user and returns access + refresh tokens
- [ ] POST /auth/register rejects duplicate email with 400
- [ ] POST /auth/login verifies credentials and returns tokens
- [ ] POST /auth/login rejects wrong password with 401
- [ ] POST /auth/refresh issues new tokens from valid refresh token
- [ ] POST /auth/refresh rejects invalid token with 401
- [ ] POST /auth/logout returns success message
- [ ] authMiddleware extracts and verifies JWT from Bearer token
- [ ] rbacMiddleware checks role against allowed roles
- [ ] Password hasher uses bcryptjs with 12 rounds
- [ ] All 9 integration tests pass

## Test Plan
- **Integration (supertest):** Full auth flow (register → login → refresh → logout), duplicate email rejection, wrong password rejection, invalid token rejection, input validation
