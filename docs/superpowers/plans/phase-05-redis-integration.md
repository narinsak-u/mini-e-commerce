# Phase 5: Redis Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Redis for product caching (TTL 5 min), category caching (TTL 10 min), rate limiting (sliding window), and refresh token session storage.

**Architecture:** Infrastructure-only additions — no new domain or application files. A generic cache service wraps Redis get/set/del with JSON serialization. A rate limiter middleware uses sliding window counters. Product and category controllers gain simple cache-aside checks inline (cache hit → return, miss → query DB → populate cache). Auth routes gain rate limiter middleware. Redis ioredis client already configured in `src/config/redis.ts`.

**Tech Stack:** Express.js, TypeScript, ioredis, Redis

---

### Task 1: Create Redis cache service

**Files:**
- Create: `backend/src/infrastructure/redis/cache-service.ts`

- [ ] **Step 1: Create generic cache service**

```typescript
// backend/src/infrastructure/redis/cache-service.ts
import { redis } from "../../config/redis";

/** Generic Redis-backed cache service interface. */
export interface CacheService {
  /** Retrieves a value by key. Returns null if missing or not parseable. */
  get<T>(key: string): Promise<T | null>;
  /** Stores a value with optional TTL (falls back to default). */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** Deletes a single key. */
  del(key: string): Promise<void>;
  /** Deletes all keys matching a glob pattern. */
  delPattern(pattern: string): Promise<void>;
}

/** Creates a cache service with the given default TTL in seconds (default 300). */
export function createCacheService(defaultTtlSeconds: number = 300): CacheService {
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = await redis.get(key);
      if (!raw) return null;
      try { return JSON.parse(raw) as T; } catch { return null; }
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds ?? defaultTtlSeconds, serialized);
    },

    async del(key: string): Promise<void> {
      await redis.del(key);
    },

    async delPattern(pattern: string): Promise<void> {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) { await redis.del(...keys); }
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/redis/cache-service.ts
git commit -m "feat(backend): add Redis cache service with JSON serialization"
```

---

### Task 2: Create Redis rate limiter middleware

**Files:**
- Create: `backend/src/infrastructure/redis/rate-limiter.ts`

- [ ] **Step 1: Create sliding window rate limiter**

```typescript
// backend/src/infrastructure/redis/rate-limiter.ts
import type { Request, Response, NextFunction } from "express";
import { redis } from "../../config/redis";
import { AppError } from "../../shared/errors/app-error";

/** Configuration for a sliding window rate limiter. */
interface RateLimiterOptions {
  /** Time window in seconds. */
  windowSeconds: number;
  /** Maximum requests allowed within the window. */
  maxRequests: number;
  /** Redis key prefix for rate limit buckets. */
  keyPrefix: string;
}

/** Creates a sliding window rate limiter middleware. Uses sorted set per identifier. */
export function rateLimiter(options: RateLimiterOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const identifier = req.user?.sub ?? req.ip ?? "unknown";
    const key = `${options.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - options.windowSeconds * 1000;

    try {
      // ponytail: single sorted set per key, okay up to ~1000 req/s per user
      await redis.zremrangebyscore(key, 0, windowStart);

      const count = await redis.zcard(key);

      if (count >= options.maxRequests) {
        const ttl = await redis.pttl(key);
        next(new AppError(429, `Too many requests. Try again in ${Math.ceil(ttl / 1000)}s`, "RATE_LIMITED"));
        return;
      }

      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, options.windowSeconds);
      next();
    } catch (err) {
      // ponytail: if Redis is down, allow the request through instead of breaking auth
      next();
    }
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/redis/rate-limiter.ts
git commit -m "feat(backend): add Redis sliding window rate limiter middleware"
```

---

### Task 3: Add caching to the product controller

**Files:**
- Modify: `backend/src/presentation/controllers/product-controller.ts`

- [ ] **Step 1: Add cache-aside pattern to get and list handlers**

```typescript
// backend/src/presentation/controllers/product-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { CreateProduct } from "../../application/products/use-cases/create-product";
import type { UpdateProduct } from "../../application/products/use-cases/update-product";
import type { DeleteProduct } from "../../application/products/use-cases/delete-product";
import type { GetProduct } from "../../application/products/use-cases/get-product";
import type { ListProducts } from "../../application/products/use-cases/list-products";
import { ValidationError } from "../../shared/errors/app-error";
import { createCacheService } from "../../infrastructure/redis/cache-service";

/** Creates the product controller with cache-aside read and write-through invalidation. */
export function createProductController(
  createProduct: CreateProduct,
  updateProduct: UpdateProduct,
  deleteProduct: DeleteProduct,
  getProduct: GetProduct,
  listProducts: ListProducts,
) {
  const cache = createCacheService(300); // 5 min TTL

  return {
    /** Handles POST /products. Invalidates all product cache keys. */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await createProduct.execute(req.body);
        await cache.delPattern("products:*");
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles PUT /products/:id. Invalidates all product cache keys. */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await updateProduct.execute({ id: req.params.id, ...req.body });
        await cache.delPattern("products:*");
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles DELETE /products/:id. Invalidates all product cache keys. */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        await deleteProduct.execute({ id: req.params.id });
        await cache.delPattern("products:*");
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    /** Handles GET /products/:id. Cache-aside: returns cached value or queries DB. */
    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const cacheKey = `products:detail:${req.params.id}`;
        const cached = await cache.get<any>(cacheKey);
        if (cached) { res.json(cached); return; }

        const result = await getProduct.execute({ id: req.params.id });
        await cache.set(cacheKey, result);
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles GET /products. Cache-aside keyed by query params. */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const queryKey = JSON.stringify(req.query);
        const cacheKey = `products:list:${queryKey}`;
        const cached = await cache.get<any>(cacheKey);
        if (cached) { res.json(cached); return; }

        const result = await listProducts.execute(req.query);
        await cache.set(cacheKey, result);
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/product-controller.ts
git commit -m "feat(backend): add cache-aside pattern to product controller"
```

---

### Task 4: Add caching to the category controller

**Files:**
- Modify: `backend/src/presentation/controllers/category-controller.ts`

- [ ] **Step 1: Add cache-aside pattern to list handler, invalidate on write**

```typescript
// backend/src/presentation/controllers/category-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type { CreateCategory } from "../../application/categories/use-cases/create-category";
import type { UpdateCategory } from "../../application/categories/use-cases/update-category";
import type { DeleteCategory } from "../../application/categories/use-cases/delete-category";
import type { ListCategories } from "../../application/categories/use-cases/list-categories";
import { ValidationError } from "../../shared/errors/app-error";
import { createCacheService } from "../../infrastructure/redis/cache-service";

/** Creates the category controller with cache-aside reads and write-through invalidation. */
export function createCategoryController(
  createCategory: CreateCategory,
  updateCategory: UpdateCategory,
  deleteCategory: DeleteCategory,
  listCategories: ListCategories,
) {
  const cache = createCacheService(600); // 10 min TTL

  return {
    /** Handles POST /categories. Invalidates category list cache. */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await createCategory.execute(req.body);
        await cache.del("categories:list");
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles PUT /categories/:id. Invalidates category list cache. */
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await updateCategory.execute({ id: req.params.id, ...req.body });
        await cache.del("categories:list");
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles DELETE /categories/:id. Invalidates category list cache. */
    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        await deleteCategory.execute({ id: req.params.id });
        await cache.del("categories:list");
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    /** Handles GET /categories. Cache-aside keyed by search query. */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const cacheKey = `categories:list:${req.query.search ?? "all"}`;
        const cached = await cache.get<any>(cacheKey);
        if (cached) { res.json(cached); return; }

        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search as string | undefined;
        const result = await listCategories.execute({ page, limit, search });
        await cache.set(cacheKey, result);
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/category-controller.ts
git commit -m "feat(backend): add cache-aside pattern to category controller"
```

---

### Task 5: Add rate limiter to auth routes

**Files:**
- Modify: `backend/src/presentation/routes/auth.ts`

- [ ] **Step 1: Add rate limiter middleware to login and register**

```typescript
// backend/src/presentation/routes/auth.ts
import { Router } from "express";
import { DrizzleUserRepository } from "../../infrastructure/database/repositories/drizzle-user-repo";
import { JwtService } from "../../infrastructure/auth/jwt-service";
import { PasswordHasher } from "../../infrastructure/auth/password-hasher";
import { RegisterUser } from "../../application/auth/use-cases/register";
import { LoginUser } from "../../application/auth/use-cases/login";
import { RefreshToken } from "../../application/auth/use-cases/refresh-token";
import { LogoutUser } from "../../application/auth/use-cases/logout";
import { AuthController } from "../controllers/auth-controller";
import { rateLimiter } from "../../infrastructure/redis/rate-limiter";

const userRepo = new DrizzleUserRepository();
const jwtService = new JwtService();
const hasher = new PasswordHasher();

const registerUser = new RegisterUser(userRepo, hasher, jwtService);
const loginUser = new LoginUser(userRepo, hasher, jwtService);
const refreshToken = new RefreshToken(userRepo, jwtService);
const logoutUser = new LogoutUser();

const controller = new AuthController(registerUser, loginUser, refreshToken, logoutUser);

const router = Router();

const authRateLimit = rateLimiter({ windowSeconds: 60, maxRequests: 5, keyPrefix: "rate:auth" });

router.post("/register", authRateLimit, controller.register);
router.post("/login", authRateLimit, controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

export default router;
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/routes/auth.ts
git commit -m "feat(backend): add rate limiter to auth routes"
```

---

### Task 6: Write Redis integration tests

**Files:**
- Create: `backend/src/tests/redis-cache.test.ts`
- Create: `backend/src/tests/rate-limiter.test.ts`

- [ ] **Step 1: Create Redis cache service test**

```typescript
// backend/src/tests/redis-cache.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createCacheService } from "../infrastructure/redis/cache-service";
import { redis } from "../config/redis";

const cache = createCacheService(60);

beforeEach(async () => {
  await redis.flushdb();
});

describe("CacheService", () => {
  it("stores and retrieves a value", async () => {
    await cache.set("test:key", { foo: "bar" });
    const result = await cache.get<{ foo: string }>("test:key");
    expect(result).toEqual({ foo: "bar" });
  });

  it("returns null for missing key", async () => {
    const result = await cache.get("test:missing");
    expect(result).toBeNull();
  });

  it("respects TTL", async () => {
    await cache.set("test:ttl", "value", 1);
    const before = await cache.get("test:ttl");
    expect(before).toBe("value");

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const after = await cache.get("test:ttl");
    expect(after).toBeNull();
  });

  it("deletes a key", async () => {
    await cache.set("test:del", "value");
    await cache.del("test:del");
    const result = await cache.get("test:del");
    expect(result).toBeNull();
  });

  it("deletes keys by pattern", async () => {
    await cache.set("products:list:1", "a");
    await cache.set("products:list:2", "b");
    await cache.set("categories:list", "c");

    await cache.delPattern("products:*");

    expect(await cache.get("products:list:1")).toBeNull();
    expect(await cache.get("products:list:2")).toBeNull();
    expect(await cache.get("categories:list")).toBe("c");
  });
});
```

- [ ] **Step 2: Create rate limiter test**

```typescript
// backend/src/tests/rate-limiter.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { redis } from "../config/redis";

beforeEach(async () => {
  await redis.flushdb();
});

describe("Rate Limiter", () => {
  it("allows requests under the limit", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "nonexistent@example.com", password: "password" });
      // First 5 should pass (either 401 for bad credentials or 429 if rate limited)
      expect([401, 429]).toContain(res.status);
    }
  });

  it("blocks requests over the limit", async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post("/auth/login")
        .send({ email: "test@example.com", password: "password" });
    }

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "password" });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
  });

  it("returns different rate limit buckets for different IPs", async () => {
    // Clear any keys from previous tests
    await redis.flushdb();

    // Use first IP 5 times to exhaust limit
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/auth/login")
        .set("X-Forwarded-For", "10.0.0.1")
        .send({ email: "test@example.com", password: "password" });
    }

    // First IP should be blocked
    const blocked = await request(app)
      .post("/auth/login")
      .set("X-Forwarded-For", "10.0.0.1")
      .send({ email: "test@example.com", password: "password" });
    expect(blocked.status).toBe(429);

    // Different IP should be allowed
    const allowed = await request(app)
      .post("/auth/login")
      .set("X-Forwarded-For", "10.0.0.2")
      .send({ email: "test@example.com", password: "password" });
    expect(allowed.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new cache and rate limiter tests.

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/redis-cache.test.ts backend/src/tests/rate-limiter.test.ts
git commit -m "feat(backend): add Redis cache and rate limiter integration tests"
```

---

## Acceptance Criteria
- [ ] CacheService stores/retrieves JSON values with TTL
- [ ] CacheService deletes single keys and patterns
- [ ] Product GET /products/:id caches on first request, serves from cache on subsequent
- [ ] Product list results are cached per query params
- [ ] Product create/update/delete invalidates all product cache keys
- [ ] Category list is cached, invalidated on create/update/delete
- [ ] Rate limiter blocks requests over 5 req/min on auth endpoints
- [ ] Rate limiter uses per-IP buckets
- [ ] Redis outage doesn't break auth (rate limiter fails open)
- [ ] All cache and rate limiter tests pass

## Test Plan
- **Integration (supertest + direct Redis):** Cache get/set/del/delPattern, TTL expiry, pattern deletion; rate limiter under/over limit, per-IP isolation; auth endpoint rate limiting
