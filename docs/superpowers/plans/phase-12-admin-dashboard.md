# Phase 12: Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build admin dashboard endpoints for managing products, orders, users, and viewing aggregated dashboard data — all protected by admin-only RBAC.

**Architecture:** Use case classes in `application/admin/use-cases/` orchestrate existing domain repositories (users, products, orders) and the Redis AnalyticsStore. The existing `AdminController` and `admin.ts` routes are extended with new endpoints. No new domain entities, repository interfaces, or infrastructure files needed — all dependencies already exist from Phases 2–11.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, Redis (ioredis), Zod, Vitest

---

### Task 1: Create admin dashboard use case

**Files:**
- Create: `backend/src/application/admin/use-cases/get-dashboard.ts`

- [ ] **Step 1: Create GetDashboard use case**

```typescript
// backend/src/application/admin/use-cases/get-dashboard.ts
import type { Redis } from "ioredis";
import { createAnalyticsStore } from "../../../infrastructure/redis/analytics-store";
import type { ProductRepository } from "../../../domain/products/repositories/product-repository";
import type { OrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { CategoryRepository } from "../../../domain/categories/repositories/category-repository";

/** Aggregated admin dashboard data. */
interface DashboardData {
  revenue: number;
  totalOrders: number;
  bestSellers: Array<{ productId: string; score: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
  recentOrders: Array<{
    id: string;
    userId: string;
    status: string;
    totalAmount: string;
    createdAt: string;
  }>;
  lowStockProducts: Array<{ id: string; name: string; stock: number }>;
  totalProducts: number;
  totalCategories: number;
}

/** Creates a use case that returns the admin dashboard aggregation. */
export function createGetDashboard(
  redis: Redis,
  productRepo: ProductRepository,
  orderRepo: OrderRepository,
  categoryRepo: CategoryRepository,
) {
  const analytics = createAnalyticsStore(redis);

  return async (): Promise<DashboardData> => {
    const [
      analyticsData,
      recentOrders,
      lowStockProducts,
      totalProducts,
      totalCategories,
    ] = await Promise.all([
      analytics.getAnalytics(),
      orderRepo.findAll({ limit: 10, orderBy: "createdAt", orderDir: "desc" }),
      productRepo.findLowStock(10),
      productRepo.count(),
      categoryRepo.count(),
    ]);

    return {
      revenue: analyticsData.revenue,
      totalOrders: analyticsData.totalOrders,
      bestSellers: analyticsData.bestSellers,
      dailyRevenue: analyticsData.dailyRevenue,
      recentOrders: recentOrders.items.map((o) => ({
        id: o.id,
        userId: o.userId,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
      })),
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
      })),
      totalProducts,
      totalCategories,
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/admin/use-cases/get-dashboard.ts
git commit -m "feat(backend): add GetDashboard use case"
```

---

### Task 2: Create admin products list use case

**Files:**
- Create: `backend/src/application/admin/use-cases/list-all-products.ts`

- [ ] **Step 1: Create ListAllProducts use case**

```typescript
// backend/src/application/admin/use-cases/list-all-products.ts
import type { ProductRepository } from "../../../domain/products/repositories/product-repository";

/** Filters for listing all products in the admin panel. */
interface ListProductsFilters {
  search?: string;
  page?: number;
  limit?: number;
  minStock?: number;
  maxStock?: number;
  isActive?: boolean;
}

/** Paginated result wrapper. */
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** Product DTO for admin product listing. */
interface ProductDto {
  id: string;
  name: string;
  slug: string;
  price: string;
  stock: number;
  categoryId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Creates a use case that returns paginated list of all products (including inactive). */
export function createListAllProducts(productRepo: ProductRepository) {
  return async (filters: ListProductsFilters): Promise<PaginatedResult<ProductDto>> => {
    const result = await productRepo.findAll({
      search: filters.search,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      minStock: filters.minStock,
      maxStock: filters.maxStock,
      isActive: filters.isActive,
      includeInactive: true,
    });

    return {
      items: result.items.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.price,
        stock: p.stock,
        categoryId: p.categoryId,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total: result.total,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/admin/use-cases/list-all-products.ts
git commit -m "feat(backend): add ListAllProducts use case"
```

---

### Task 3: Create admin orders list use case

**Files:**
- Create: `backend/src/application/admin/use-cases/list-all-orders.ts`

- [ ] **Step 1: Create ListAllOrders use case**

```typescript
// backend/src/application/admin/use-cases/list-all-orders.ts
import type { OrderRepository } from "../../../domain/orders/repositories/order-repository";

/** Filters for listing all orders in the admin panel. */
interface ListOrdersFilters {
  status?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/** Order item DTO for admin order listing. */
interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  productPrice: string;
  quantity: number;
  subtotal: string;
}

/** Order DTO for admin order listing. */
interface OrderDto {
  id: string;
  userId: string;
  status: string;
  totalAmount: string;
  items: OrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

/** Paginated orders result. */
interface PaginatedOrders {
  items: OrderDto[];
  total: number;
  page: number;
  limit: number;
}

/** Creates a use case that returns paginated list of all orders with optional filters. */
export function createListAllOrders(orderRepo: OrderRepository) {
  return async (filters: ListOrdersFilters): Promise<PaginatedOrders> => {
    const result = await orderRepo.findAll({
      status: filters.status,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      startDate: filters.startDate,
      endDate: filters.endDate,
      includeItems: true,
    });

    return {
      items: result.items.map((o) => ({
        id: o.id,
        userId: o.userId,
        status: o.status,
        totalAmount: o.totalAmount,
        items: (o.items ?? []).map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          productPrice: i.productPrice,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      })),
      total: result.total,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/admin/use-cases/list-all-orders.ts
git commit -m "feat(backend): add ListAllOrders use case"
```

---

### Task 4: Create admin users list use case

**Files:**
- Create: `backend/src/application/admin/use-cases/list-users.ts`

- [ ] **Step 1: Create ListUsers use case**

```typescript
// backend/src/application/admin/use-cases/list-users.ts
import type { UserRepository } from "../../../domain/users/repositories/user-repository";

/** Filters for listing users in the admin panel. */
interface ListUsersFilters {
  role?: string;
  page?: number;
  limit?: number;
  search?: string;
}

/** User DTO for admin user listing. */
interface UserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

/** Paginated users result. */
interface PaginatedUsers {
  items: UserDto[];
  total: number;
  page: number;
  limit: number;
}

/** Creates a use case that returns paginated list of users with optional filters. */
export function createListUsers(userRepo: UserRepository) {
  return async (filters: ListUsersFilters): Promise<PaginatedUsers> => {
    const result = await userRepo.findAll({
      role: filters.role,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
      search: filters.search,
    });

    return {
      items: result.items.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      total: result.total,
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/admin/use-cases/list-users.ts
git commit -m "feat(backend): add ListUsers use case"
```

---

### Task 5: Create admin user role update use case

**Files:**
- Create: `backend/src/application/admin/use-cases/update-user-role.ts`

- [ ] **Step 1: Create UpdateUserRole use case**

```typescript
// backend/src/application/admin/use-cases/update-user-role.ts
import type { UserRepository } from "../../../domain/users/repositories/user-repository";

/** Updated user DTO returned after role change. */
interface UpdatedUserDto {
  id: string;
  email: string;
  name: string;
  role: string;
}

/** Creates a use case that updates a user's role with validation. */
export function createUpdateUserRole(userRepo: UserRepository) {
  return async (userId: string, role: string): Promise<UpdatedUserDto> => {
    const user = await userRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const validRoles = ["customer", "admin"];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
    }

    const updated = await userRepo.update(userId, { role });
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
    };
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/admin/use-cases/update-user-role.ts
git commit -m "feat(backend): add UpdateUserRole use case"
```

---

### Task 6: Extend admin controller with new endpoints

**Files:**
- Modify: `backend/src/presentation/controllers/admin-controller.ts`

- [ ] **Step 1: Extend AdminController with dashboard, products, orders, users endpoints**

```typescript
// backend/src/presentation/controllers/admin-controller.ts
import type { Request, Response, NextFunction } from "express";
import type { Redis } from "ioredis";
import { createAnalyticsStore } from "../../infrastructure/redis/analytics-store";
import { createGetDashboard } from "../../application/admin/use-cases/get-dashboard";
import { createListAllProducts } from "../../application/admin/use-cases/list-all-products";
import { createListAllOrders } from "../../application/admin/use-cases/list-all-orders";
import { createListUsers } from "../../application/admin/use-cases/list-users";
import { createUpdateUserRole } from "../../application/admin/use-cases/update-user-role";
import type { ProductRepository } from "../../domain/products/repositories/product-repository";
import type { OrderRepository } from "../../domain/orders/repositories/order-repository";
import type { CategoryRepository } from "../../domain/categories/repositories/category-repository";
import type { UserRepository } from "../../domain/users/repositories/user-repository";

/** Creates the admin controller with full dashboard, products, orders, and users management endpoints. */
export function createAdminController(
  productRepo: ProductRepository,
  orderRepo: OrderRepository,
  categoryRepo: CategoryRepository,
  userRepo: UserRepository,
  redis: Redis,
) {
  const analytics = createAnalyticsStore(redis);
  const getDashboard = createGetDashboard(redis, productRepo, orderRepo, categoryRepo);
  const listAllProducts = createListAllProducts(productRepo);
  const listAllOrders = createListAllOrders(orderRepo);
  const listUsers = createListUsers(userRepo);
  const updateUserRole = createUpdateUserRole(userRepo);

  return {
    /** GET /admin/analytics - Returns analytics data from Redis. */
    async getAnalytics(_req: Request, res: Response, next: NextFunction) {
      try {
        const result = await analytics.getAnalytics();
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    /** GET /admin/dashboard - Returns aggregated dashboard data. */
    async dashboard(_req: Request, res: Response, next: NextFunction) {
      try {
        const result = await getDashboard();
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    /** GET /admin/products - Returns paginated product list. @throws validation errors from query params. */
    async listProducts(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await listAllProducts({
          search: req.query.search as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          minStock: req.query.minStock ? Number(req.query.minStock) : undefined,
          maxStock: req.query.maxStock ? Number(req.query.maxStock) : undefined,
          isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    /** GET /admin/orders - Returns paginated order list with optional filters. */
    async listOrders(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await listAllOrders({
          status: req.query.status as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          startDate: req.query.startDate as string | undefined,
          endDate: req.query.endDate as string | undefined,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    /** PATCH /admin/orders/:id/status - Updates order status with validation. @throws 400 if status is missing or invalid, 404 if order not found. */
    async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
          res.status(400).json({ error: "status is required" });
          return;
        }
        const validStatuses = ["pending", "paid", "packing", "shipping", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
          res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
          return;
        }
        // ponytail: inject orderRepo directly, add use case when status transitions have side effects
        const { orderRepo } = req.app.locals;
        const updated = await orderRepo.update(id, { status });
        if (!updated) {
          res.status(404).json({ error: "Order not found" });
          return;
        }
        res.json(updated);
      } catch (err) {
        next(err);
      }
    },

    /** GET /admin/users - Returns paginated user list with optional role filter and search. */
    async listUsers(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await listUsers({
          role: req.query.role as string | undefined,
          page: req.query.page ? Number(req.query.page) : undefined,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          search: req.query.search as string | undefined,
        });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },

    /** PATCH /admin/users/:id/role - Updates user role with validation. @throws 400 for invalid role, 404 if user not found. */
    async updateUserRole(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const { role } = req.body;
        if (!role) {
          res.status(400).json({ error: "role is required" });
          return;
        }
        const result = await updateUserRole(id, role);
        res.json(result);
      } catch (err) {
        next(err instanceof Error && (err.message === "User not found" || err.message.startsWith("Invalid role"))
          ? { statusCode: 400, message: err.message }
          : err);
      }
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/admin-controller.ts
git commit -m "feat(backend): extend AdminController with dashboard, products, orders, users endpoints"
```

---

### Task 7: Wire new admin routes

**Files:**
- Modify: `backend/src/presentation/routes/admin.ts`

- [ ] **Step 1: Update admin routes with new endpoints**

```typescript
// backend/src/presentation/routes/admin.ts
import { Router } from "express";
import type { Redis } from "ioredis";
import { createAdminController } from "../controllers/admin-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";
import type { ProductRepository } from "../../domain/products/repositories/product-repository";
import type { OrderRepository } from "../../domain/orders/repositories/order-repository";
import type { CategoryRepository } from "../../domain/categories/repositories/category-repository";
import type { UserRepository } from "../../domain/users/repositories/user-repository";

/** Creates the admin router with all admin-only endpoints. */
export function createAdminRouter(
  productRepo: ProductRepository,
  orderRepo: OrderRepository,
  categoryRepo: CategoryRepository,
  userRepo: UserRepository,
  redis: Redis,
): Router {
  const controller = createAdminController(productRepo, orderRepo, categoryRepo, userRepo, redis);
  const router = Router();

  router.use(authMiddleware, rbacMiddleware("admin"));

  router.get("/analytics", controller.getAnalytics);
  router.get("/dashboard", controller.dashboard);
  router.get("/products", controller.listProducts);
  router.get("/orders", controller.listOrders);
  router.patch("/orders/:id/status", controller.updateOrderStatus);
  router.get("/users", controller.listUsers);
  router.patch("/users/:id/role", controller.updateUserRole);

  return router;
}
```

- [ ] **Step 2: Update app wiring to use factory**

```typescript
// backend/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { redis } from "./config/redis";
import { errorHandler } from "./presentation/middleware/error-handler";
import { db } from "./config/database";
import { DrizzleProductRepository } from "./infrastructure/database/repositories/drizzle-product-repo";
import { DrizzleOrderRepository } from "./infrastructure/database/repositories/drizzle-order-repo";
import { DrizzleCategoryRepository } from "./infrastructure/database/repositories/drizzle-category-repo";
import { DrizzleUserRepository } from "./infrastructure/database/repositories/drizzle-user-repo";
import authRoutes from "./presentation/routes/auth";
import categoryRoutes from "./presentation/routes/categories";
import productRoutes from "./presentation/routes/products";
import cartRoutes from "./presentation/routes/cart";
import checkoutRoutes from "./presentation/routes/checkout";
import orderRoutes from "./presentation/routes/orders";
import notificationRoutes from "./presentation/routes/notifications";
import { createAdminRouter } from "./presentation/routes/admin";

const app = express();

app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(compression());
app.use(express.json());

const productRepo = new DrizzleProductRepository(db);
const orderRepo = new DrizzleOrderRepository(db);
const categoryRepo = new DrizzleCategoryRepository(db);
const userRepo = new DrizzleUserRepository(db);

app.locals.orderRepo = orderRepo;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/categories", categoryRoutes);
app.use("/products", productRoutes);
app.use("/cart", cartRoutes);
app.use("/checkout", checkoutRoutes);
app.use("/orders", orderRoutes);
app.use("/notifications", notificationRoutes);
app.use("/admin", createAdminRouter(productRepo, orderRepo, categoryRepo, userRepo, redis));

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/routes/admin.ts backend/src/index.ts
git commit -m "feat(backend): wire admin dashboard routes and app dependencies"
```

---

### Task 8: Write admin dashboard integration tests

**Files:**
- Create: `backend/src/tests/admin-dashboard.test.ts`

- [ ] **Step 1: Create admin dashboard test file**

```typescript
// backend/src/tests/admin-dashboard.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { redis } from "../config/redis";
import { db } from "../config/database";
import { users } from "../infrastructure/database/drizzle/schema/users";
import { products } from "../infrastructure/database/drizzle/schema/products";
import { categories } from "../infrastructure/database/drizzle/schema/categories";
import { orders } from "../infrastructure/database/drizzle/schema/orders";
import { orderItems } from "../infrastructure/database/drizzle/schema/order-items";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("Admin Dashboard API", () => {
  const adminEmail = `admin-${randomUUID()}@example.com`;
  let adminToken = "";
  let customerToken = "";

  beforeAll(async () => {
    await redis.flushdb();

    // Seed analytics
    await redis.set("analytics:revenue", "5000");
    await redis.set("analytics:total_orders", "15");
    await redis.zincrby("analytics:best_sellers", 8, "prod-1");

    // Create admin user
    const adminRes = await request(app)
      .post("/auth/register")
      .send({ name: "Admin", email: adminEmail, password: "password123" });
    adminToken = adminRes.body.accessToken;
    await db.update(users).set({ role: "admin" }).where(eq(users.email, adminEmail));

    // Create customer
    const custRes = await request(app)
      .post("/auth/register")
      .send({ name: "Customer", email: `cust-${randomUUID()}@example.com`, password: "password123" });
    customerToken = custRes.body.accessToken;
  });

  afterAll(async () => {
    await redis.flushdb();
    await db.delete(users).where(eq(users.email, adminEmail));
  });

  describe("GET /admin/dashboard", () => {
    it("returns aggregated dashboard data for admin", async () => {
      const res = await request(app)
        .get("/admin/dashboard")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("revenue");
      expect(res.body).toHaveProperty("totalOrders", 15);
      expect(res.body).toHaveProperty("bestSellers");
      expect(res.body).toHaveProperty("dailyRevenue");
      expect(res.body).toHaveProperty("recentOrders");
      expect(res.body).toHaveProperty("lowStockProducts");
      expect(res.body).toHaveProperty("totalProducts");
      expect(res.body).toHaveProperty("totalCategories");
    });

    it("rejects non-admin access", async () => {
      const res = await request(app)
        .get("/admin/dashboard")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
    });

    it("rejects unauthenticated access", async () => {
      const res = await request(app).get("/admin/dashboard");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /admin/products", () => {
    it("returns product list for admin", async () => {
      const res = await request(app)
        .get("/admin/products")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("limit");
    });
  });

  describe("GET /admin/orders", () => {
    it("returns order list for admin", async () => {
      const res = await request(app)
        .get("/admin/orders")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("total");
    });

    it("filters orders by status", async () => {
      const res = await request(app)
        .get("/admin/orders?status=pending")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe("PATCH /admin/orders/:id/status", () => {
    it("rejects non-admin", async () => {
      const res = await request(app)
        .patch("/admin/orders/some-id/status")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ status: "shipping" });
      expect(res.status).toBe(403);
    });

    it("requires status in body", async () => {
      const res = await request(app)
        .patch("/admin/orders/some-id/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it("rejects invalid status", async () => {
      const res = await request(app)
        .patch("/admin/orders/some-id/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "invalid_status" });
      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent order", async () => {
      const res = await request(app)
        .patch(`/admin/orders/${randomUUID()}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "shipping" });
      expect(res.status).toBe(404);
    });
  });

  describe("GET /admin/users", () => {
    it("returns user list for admin", async () => {
      const res = await request(app)
        .get("/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("items");
      expect(res.body).toHaveProperty("total");
    });
  });

  describe("PATCH /admin/users/:id/role", () => {
    it("rejects non-admin", async () => {
      const res = await request(app)
        .patch("/admin/users/some-id/role")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ role: "admin" });
      expect(res.status).toBe(403);
    });

    it("requires role in body", async () => {
      const res = await request(app)
        .patch("/admin/users/some-id/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new admin dashboard tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/admin-dashboard.test.ts
git commit -m "test(backend): add admin dashboard integration tests"
```

---

## Acceptance Criteria
- [ ] GET /admin/dashboard returns revenue, totalOrders, bestSellers, dailyRevenue, recentOrders, lowStockProducts, totalProducts, totalCategories
- [ ] GET /admin/products returns paginated products list including inactive products, supports search, stock filter
- [ ] GET /admin/orders returns paginated orders list with status filter, date range
- [ ] PATCH /admin/orders/:id/status updates order status with validation
- [ ] GET /admin/users returns paginated users list with role filter, search
- [ ] PATCH /admin/users/:id/role updates user role with validation
- [ ] All endpoints require auth + admin role
- [ ] All tests pass

## Test Plan
- **Integration (DB + Redis + auth):** Dashboard aggregation, product listing with filters, order listing with filters, order status update validation (missing body, invalid status, non-existent order), user listing, role update validation, RBAC enforcement for all endpoints
