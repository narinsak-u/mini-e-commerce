# Phase 6: Shopping Cart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Redis-backed shopping cart with add/update/remove/clear operations, product detail enrichment, and authenticated endpoints.

**Architecture:** Domain entity (CartItem) → Repository interface (ICartRepository) → Redis implementation that stores cart as `cart:{userId}` hash maps (productId → JSON string) and enriches items with product name/price/image from PostgreSQL on read. Each cart operation is a single use case. Controller delegates to use cases.

**Tech Stack:** Express.js, TypeScript, ioredis, Redis, PostgreSQL, Zod

---

### Task 1: Create cart domain entity
**Files:**
- Create: `backend/src/domain/cart/entities/cart.ts`

- [ ] **Step 1: Create Cart and CartItem types**

```typescript
// backend/src/domain/cart/entities/cart.ts

/** A single item in a shopping cart with enriched product data. */
export interface CartItem {
  productId: string;
  quantity: number;
  name: string;
  price: string;
  imageUrl: string | null;
  subtotal: string;
}

/** A shopping cart belonging to a user. */
export interface Cart {
  userId: string;
  items: CartItem[];
  readonly totalAmount: string;
  readonly itemCount: number;
}

/** Creates a Cart with computed totalAmount and itemCount. */
export function createCart(userId: string, items: CartItem[]): Cart {
  return {
    userId,
    items,
    get totalAmount(): string {
      const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
      return total.toFixed(2);
    },
    get itemCount(): number {
      return items.reduce((sum, item) => sum + item.quantity, 0);
    },
  };
}
```

- [ ] **Step 2: Create directories and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\cart\entities" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/cart/entities/cart.ts
git commit -m "feat(backend): add Cart entity and CartItem interface"
```

---

### Task 2: Create ICartRepository interface
**Files:**
- Create: `backend/src/domain/cart/repositories/cart-repository.ts`

- [ ] **Step 1: Create cart repository interface**

```typescript
// backend/src/domain/cart/repositories/cart-repository.ts
import type { Cart, CartItem } from "../entities/cart";

/** Repository interface for Redis-backed shopping cart operations. */
export interface ICartRepository {
  /** Retrieves the full cart for a user. */
  findByUserId(userId: string): Promise<Cart>;
  /** Adds a product (or increments quantity) in the user's cart. */
  addItem(userId: string, productId: string, quantity: number): Promise<void>;
  /** Sets a specific item's quantity (removes if <= 0). */
  updateQuantity(userId: string, productId: string, quantity: number): Promise<void>;
  /** Removes an item from the cart entirely. */
  removeItem(userId: string, productId: string): Promise<void>;
  /** Empties the user's cart. */
  clear(userId: string): Promise<void>;
}

/** Provides enriched product data (name, price, image) from PostgreSQL. */
export interface IProductDataProvider {
  /** Looks up product info by ID. Returns null if not found. */
  getProductInfo(productId: string): Promise<Pick<CartItem, "name" | "price" | "imageUrl"> | null>;
}
```

- [ ] **Step 2: Create directories and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\cart\repositories" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/cart/repositories/cart-repository.ts
git commit -m "feat(backend): add ICartRepository interface and IProductDataProvider"
```

---

### Task 3: Create RedisCartRepository implementation
**Files:**
- Create: `backend/src/infrastructure/redis/cart-repository.ts`

- [ ] **Step 1: Create Redis cart repository**

```typescript
// backend/src/infrastructure/redis/cart-repository.ts
import { redis } from "../../config/redis";
import { db } from "../../config/database";
import { eq } from "drizzle-orm";
import { products } from "../database/drizzle/schema/products";
import type { ICartRepository, IProductDataProvider } from "../../domain/cart/repositories/cart-repository";
import { createCart, type CartItem } from "../../domain/cart/entities/cart";

/** Creates a product data provider that queries PostgreSQL. */
export function createProductDataProvider(): IProductDataProvider {
  return {
    async getProductInfo(productId: string): Promise<Pick<CartItem, "name" | "price" | "imageUrl"> | null> {
      const row = await db
        .select({ name: products.name, price: products.price, imageUrl: products.imageUrl })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);
      if (!row[0]) return null;
      return row[0];
    },
  };
}

/** Creates a Redis-backed cart repository with product enrichment. */
export function createRedisCartRepo(
  productProvider: IProductDataProvider = createProductDataProvider(),
): ICartRepository {
  const keyPrefix = "cart:";
  const cartKey = (userId: string) => `${keyPrefix}${userId}`;

  return {
    async findByUserId(userId: string): Promise<Cart> {
      const raw = await redis.hgetall(cartKey(userId));
      const items: CartItem[] = [];

      for (const [productId, json] of Object.entries(raw)) {
        const parsed = JSON.parse(json);
        items.push({
          productId,
          quantity: parsed.quantity,
          name: parsed.name,
          price: parsed.price,
          imageUrl: parsed.imageUrl ?? null,
          subtotal: (Number(parsed.price) * parsed.quantity).toFixed(2),
        });
      }

      return createCart(userId, items);
    },

    async addItem(userId: string, productId: string, quantity: number): Promise<void> {
      const existing = await redis.hget(cartKey(userId), productId);

      if (existing) {
        const parsed = JSON.parse(existing);
        parsed.quantity += quantity;
        await redis.hset(cartKey(userId), productId, JSON.stringify(parsed));
        return;
      }

      const info = await productProvider.getProductInfo(productId);
      if (!info) return;

      const value = JSON.stringify({ quantity, name: info.name, price: info.price, imageUrl: info.imageUrl });
      await redis.hset(cartKey(userId), productId, value);
    },

    async updateQuantity(userId: string, productId: string, quantity: number): Promise<void> {
      if (quantity <= 0) {
        await redis.hdel(cartKey(userId), productId);
        return;
      }

      const existing = await redis.hget(cartKey(userId), productId);
      if (!existing) return;

      const parsed = JSON.parse(existing);
      parsed.quantity = quantity;
      await redis.hset(cartKey(userId), productId, JSON.stringify(parsed));
    },

    async removeItem(userId: string, productId: string): Promise<void> {
      await redis.hdel(cartKey(userId), productId);
    },

    async clear(userId: string): Promise<void> {
      await redis.del(cartKey(userId));
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/redis/cart-repository.ts
git commit -m "feat(backend): add RedisCartRepository with product enrichment"
```

---

### Task 4: Create cart use cases

**Files:**
- Create: `backend/src/application/cart/use-cases/get-cart.ts`
- Create: `backend/src/application/cart/use-cases/add-item.ts`
- Create: `backend/src/application/cart/use-cases/update-quantity.ts`
- Create: `backend/src/application/cart/use-cases/remove-item.ts`
- Create: `backend/src/application/cart/use-cases/clear-cart.ts`

- [ ] **Step 1: Create GetCart use case**

```typescript
// backend/src/application/cart/use-cases/get-cart.ts
import { z } from "zod";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

const schema = z.object({
  userId: z.string().uuid(),
});

/** Creates a GetCart use case. */
export function createGetCart(cartRepo: ICartRepository) {
  /** Returns the user's cart with enriched items. @throws ZodError on invalid input. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    return cartRepo.findByUserId(data.userId);
  };
}
```

- [ ] **Step 2: Create AddCartItem use case**

```typescript
// backend/src/application/cart/use-cases/add-item.ts
import { z } from "zod";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

const schema = z.object({
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

/** Creates an AddCartItem use case. */
export function createAddCartItem(cartRepo: ICartRepository) {
  /** Adds an item to the cart (or increments quantity) and returns the updated cart. @throws ZodError on invalid input. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    await cartRepo.addItem(data.userId, data.productId, data.quantity);
    return cartRepo.findByUserId(data.userId);
  };
}
```

- [ ] **Step 3: Create UpdateCartItemQuantity use case**

```typescript
// backend/src/application/cart/use-cases/update-quantity.ts
import { z } from "zod";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

const schema = z.object({
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
});

/** Creates an UpdateCartItemQuantity use case. */
export function createUpdateCartItemQuantity(cartRepo: ICartRepository) {
  /** Updates item quantity (0 removes the item) and returns the updated cart. @throws ZodError on invalid input. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    await cartRepo.updateQuantity(data.userId, data.productId, data.quantity);
    return cartRepo.findByUserId(data.userId);
  };
}
```

- [ ] **Step 4: Create RemoveCartItem use case**

```typescript
// backend/src/application/cart/use-cases/remove-item.ts
import { z } from "zod";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

const schema = z.object({
  userId: z.string().uuid(),
  productId: z.string().uuid(),
});

/** Creates a RemoveCartItem use case. */
export function createRemoveCartItem(cartRepo: ICartRepository) {
  /** Removes an item from the cart and returns the updated cart. @throws ZodError on invalid input. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    await cartRepo.removeItem(data.userId, data.productId);
    return cartRepo.findByUserId(data.userId);
  };
}
```

- [ ] **Step 5: Create ClearCart use case**

```typescript
// backend/src/application/cart/use-cases/clear-cart.ts
import { z } from "zod";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

const schema = z.object({
  userId: z.string().uuid(),
});

/** Creates a ClearCart use case. */
export function createClearCart(cartRepo: ICartRepository) {
  /** Empties the user's cart. @throws ZodError on invalid input. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    await cartRepo.clear(data.userId);
    return { message: "Cart cleared" };
  };
}
```

- [ ] **Step 6: Create directory and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\application\cart\use-cases" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/cart/use-cases/
git commit -m "feat(backend): add cart use cases (get, add, update, remove, clear)"
```

---

### Task 5: Create cart controller
**Files:**
- Create: `backend/src/presentation/controllers/cart-controller.ts`

- [ ] **Step 1: Create CartController**

```typescript
// backend/src/presentation/controllers/cart-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../../shared/errors/app-error";

/** Creates the cart controller. Each method delegates to a curried use case. */
export function createCartController(
  getCart: (input: { userId: string }) => Promise<any>,
  addCartItem: (input: { userId: string; productId: string; quantity: number }) => Promise<any>,
  updateCartItemQuantity: (input: { userId: string; productId: string; quantity: number }) => Promise<any>,
  removeCartItem: (input: { userId: string; productId: string }) => Promise<any>,
  clearCart: (input: { userId: string }) => Promise<{ message: string }>,
) {
  return {
    /** Handles GET /cart. @throws ValidationError on invalid input. */
    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await getCart({ userId: req.user!.sub });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles POST /cart/items. @throws ValidationError on invalid input. */
    async add(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await addCartItem({
          userId: req.user!.sub,
          productId: req.body.productId,
          quantity: req.body.quantity,
        });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles PATCH /cart/items/:productId. @throws ValidationError on invalid input. */
    async updateQuantity(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await updateCartItemQuantity({
          userId: req.user!.sub,
          productId: req.params.productId,
          quantity: req.body.quantity,
        });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles DELETE /cart/items/:productId. @throws ValidationError on invalid input. */
    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await removeCartItem({
          userId: req.user!.sub,
          productId: req.params.productId,
        });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles DELETE /cart. @throws ValidationError on invalid input. */
    async clear(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await clearCart({ userId: req.user!.sub });
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
git add backend/src/presentation/controllers/cart-controller.ts
git commit -m "feat(backend): add cart controller"
```

---

### Task 6: Create cart routes
**Files:**
- Create: `backend/src/presentation/routes/cart.ts`

- [ ] **Step 1: Create cart routes**

```typescript
// backend/src/presentation/routes/cart.ts
import { Router } from "express";
import { createRedisCartRepo } from "../../infrastructure/redis/cart-repository";
import { createGetCart } from "../../application/cart/use-cases/get-cart";
import { createAddCartItem } from "../../application/cart/use-cases/add-item";
import { createUpdateCartItemQuantity } from "../../application/cart/use-cases/update-quantity";
import { createRemoveCartItem } from "../../application/cart/use-cases/remove-item";
import { createClearCart } from "../../application/cart/use-cases/clear-cart";
import { createCartController } from "../controllers/cart-controller";
import { authMiddleware } from "../middleware/auth";

const cartRepo = createRedisCartRepo();
const getCart = createGetCart(cartRepo);
const addCartItem = createAddCartItem(cartRepo);
const updateCartItemQuantity = createUpdateCartItemQuantity(cartRepo);
const removeCartItem = createRemoveCartItem(cartRepo);
const clearCart = createClearCart(cartRepo);

const controller = createCartController(
  getCart,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
);

const router = Router();

router.use(authMiddleware);

router.get("/", controller.get);
router.post("/items", controller.add);
router.patch("/items/:productId", controller.updateQuantity);
router.delete("/items/:productId", controller.remove);
router.delete("/", controller.clear);

export default router;
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/routes/cart.ts
git commit -m "feat(backend): add cart routes with auth middleware"
```

---

### Task 7: Wire cart routes into the Express app
**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update index.ts to mount cart routes**

```typescript
// backend/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { errorHandler } from "./presentation/middleware/error-handler";
import authRoutes from "./presentation/routes/auth";
import categoryRoutes from "./presentation/routes/categories";
import productRoutes from "./presentation/routes/products";
import cartRoutes from "./presentation/routes/cart";

const app = express();

app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(compression());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 2: Start server and verify cart endpoints**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3000.

Run: `curl http://localhost:3000/cart -H "Authorization: Bearer <token>"`
Expected: `{ "userId": "...", "items": [], "totalAmount": "0.00", "itemCount": 0 }`

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/index.ts
git commit -m "feat(backend): wire cart routes into Express app"
```

---

### Task 8: Write cart integration tests
**Files:**
- Create: `backend/src/tests/cart.test.ts`

- [ ] **Step 1: Create cart test file**

```typescript
// backend/src/tests/cart.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { redis } from "../config/redis";
import { eq } from "drizzle-orm";
import { users, categories, products } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";

const adminEmail = `admin-${randomUUID()}@example.com`;
const adminPassword = "password123";
let adminToken = "";
let customerToken = "";
let productId = "";

beforeAll(async () => {
  await redis.flushdb();

  // Create admin user
  const adminRes = await request(app)
    .post("/auth/register")
    .send({ name: "Admin", email: adminEmail, password: adminPassword });
  adminToken = adminRes.body.accessToken;
  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, adminEmail));

  // Create customer user
  const custEmail = `cust-${randomUUID()}@example.com`;
  const custRes = await request(app)
    .post("/auth/register")
    .send({ name: "Customer", email: custEmail, password: "password123" });
  customerToken = custRes.body.accessToken;

  // Create a category and product to add to cart
  const catRes = await request(app)
    .post("/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Test Category" });
  const categoryId = catRes.body.id;

  const prodRes = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      name: "Test Product",
      price: "19.99",
      stock: 100,
      categoryId,
    });
  productId = prodRes.body.id;
});

afterAll(async () => {
  await redis.flushdb();
  await db.delete(products);
  await db.delete(categories);
  await db.delete(users).where(eq(users.email, adminEmail));
});

describe("Cart API", () => {
  it("returns empty cart for new user", async () => {
    const res = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.totalAmount).toBe("0.00");
    expect(res.body.itemCount).toBe(0);
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/cart");
    expect(res.status).toBe(401);
  });

  it("adds an item to the cart", async () => {
    const res = await request(app)
      .post("/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].productId).toBe(productId);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.items[0].name).toBe("Test Product");
    expect(res.body.items[0].price).toBe("19.99");
    expect(res.body.items[0].subtotal).toBe("39.98");
    expect(res.body.totalAmount).toBe("39.98");
    expect(res.body.itemCount).toBe(2);
  });

  it("increments quantity when adding an existing product", async () => {
    const res = await request(app)
      .post("/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].quantity).toBe(5);
    expect(res.body.items[0].subtotal).toBe("99.95");
  });

  it("updates item quantity", async () => {
    const res = await request(app)
      .patch(`/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 1 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].quantity).toBe(1);
    expect(res.body.items[0].subtotal).toBe("19.99");
  });

  it("removes item when quantity set to 0", async () => {
    const res = await request(app)
      .patch(`/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ quantity: 0 });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("adds item again then removes it", async () => {
    await request(app)
      .post("/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 });

    const removeRes = await request(app)
      .delete(`/cart/items/${productId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.items).toEqual([]);
  });

  it("clears the entire cart", async () => {
    await request(app)
      .post("/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 3 });

    const clearRes = await request(app)
      .delete("/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(clearRes.status).toBe(200);
    expect(clearRes.body.message).toBe("Cart cleared");

    const getRes = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(getRes.body.items).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new cart tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/cart.test.ts
git commit -m "feat(backend): add cart integration tests"
```

---

## Acceptance Criteria
- [ ] GET /cart returns empty cart for new users
- [ ] GET /cart returns enriched items (name, price, imageUrl, subtotal)
- [ ] POST /cart/items adds item and increments quantity on re-add
- [ ] PATCH /cart/items/:productId updates quantity (0 = remove)
- [ ] DELETE /cart/items/:productId removes specific item
- [ ] DELETE /cart clears entire cart
- [ ] All cart endpoints require authentication (401 without token)
- [ ] Cart totalAmount and itemCount are computed correctly
- [ ] All 10 integration tests pass

## Test Plan
- **Integration (supertest + Redis):** Empty cart, unauthenticated rejection, add item with enrichment, increment on re-add, update quantity, remove via quantity=0, delete item, clear cart, verify empty after clear
