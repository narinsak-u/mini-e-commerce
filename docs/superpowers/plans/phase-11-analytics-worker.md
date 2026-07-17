# Phase 11: Analytics Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume `payment.completed` events, update analytics data in Redis, and expose an admin-only GET /admin/analytics endpoint.

**Architecture:** Redis-backed analytics store (no new DB tables) → RabbitMQ consumer (analytics worker) → Admin controller + routes. Worker uses Redis INCRBY for revenue/orders, ZINCRBY for best-seller scores, and daily revenue keys. Admin endpoint reads all analytics from Redis and returns a summary.

**Tech Stack:** Express.js, TypeScript, ioredis, Redis, RabbitMQ (amqplib), Vitest

---

### Task 1: Create Redis analytics store

**Files:**
- Create: `backend/src/infrastructure/redis/analytics-store.ts`

- [ ] **Step 1: Create analytics store**

```typescript
// backend/src/infrastructure/redis/analytics-store.ts
import type { Redis } from "ioredis";

/** Analytics data stored in Redis. */
export interface Analytics {
  revenue: number;
  totalOrders: number;
  bestSellers: Array<{ productId: string; score: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
}

// ponytail: Redis is enough for MVP dashboard, add DB persistence when historical analytics are needed
/** Creates an analytics store backed by Redis. */
export function createAnalyticsStore(redis: Redis) {
  return {
    /** Increments total revenue by the given amount. */
    async incrementRevenue(amount: string): Promise<void> {
      await redis.incrbyfloat("analytics:revenue", Number(amount));
    },

    /** Increments the total orders counter by one. */
    async incrementOrders(): Promise<void> {
      await redis.incr("analytics:total_orders");
    },

    /** Increments the best seller score for a product by quantity. */
    async incrementBestSeller(productId: string, quantity: number): Promise<void> {
      await redis.zincrby("analytics:best_sellers", quantity, productId);
    },

    /** Records daily revenue for the current date keyed by ISO date string. */
    async recordDailyRevenue(amount: string): Promise<void> {
      const today = new Date().toISOString().slice(0, 10);
      await redis.incrbyfloat(`analytics:daily:${today}`, Number(amount));
    },

    /** Returns all analytics data from Redis. */
    async getAnalytics(): Promise<Analytics> {
      const [revenue, totalOrders, bestSellers, dailyKeys] = await Promise.all([
        redis.get("analytics:revenue").then((v) => Number(v ?? 0)),
        redis.get("analytics:total_orders").then((v) => Number(v ?? 0)),
        redis.zrevrange("analytics:best_sellers", 0, 9, "WITHSCORES").then((result) => {
          const items: Array<{ productId: string; score: number }> = [];
          for (let i = 0; i < result.length; i += 2) {
            items.push({ productId: result[i], score: Number(result[i + 1]) });
          }
          return items;
        }),
        redis.keys("analytics:daily:*"),
      ]);

      const dailyRevenue: Array<{ date: string; amount: number }> = [];
      if (dailyKeys.length > 0) {
        const values = await redis.mget(...dailyKeys);
        for (let i = 0; i < dailyKeys.length; i++) {
          const date = dailyKeys[i].replace("analytics:daily:", "");
          dailyRevenue.push({ date, amount: Number(values[i] ?? 0) });
        }
        dailyRevenue.sort((a, b) => a.date.localeCompare(b.date));
      }

      return { revenue, totalOrders, bestSellers, dailyRevenue };
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/redis/analytics-store.ts
git commit -m "feat(backend): add Redis analytics store"
```

---

### Task 2: Create analytics worker

**Files:**
- Create: `backend/src/infrastructure/rabbitmq/consumers/analytics-worker.ts`

- [ ] **Step 1: Create analytics worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/analytics-worker.ts
import { getRabbitChannel } from "../../../config/rabbitmq";
import type { Redis } from "ioredis";
import { createAnalyticsStore } from "../../redis/analytics-store";

const QUEUE = "analytics";
const ROUTING_KEY = "payment.completed";

/** Payment completed event payload consumed from RabbitMQ. */
interface PaymentCompletedEvent {
  orderId: string;
  userId: string;
  paymentId: string;
  totalAmount: string;
  items?: { productId: string; quantity: number; subtotal: string }[];
  timestamp: string;
}

/** Creates the analytics worker that consumes payment.completed events from the analytics queue. */
export function createAnalyticsWorker(redis: Redis) {
  const analytics = createAnalyticsStore(redis);

  return async function startAnalyticsWorker(): Promise<void> {
    const ch = await getRabbitChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    await ch.bindQueue(QUEUE, "shop.exchange", ROUTING_KEY);

    await ch.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const event: PaymentCompletedEvent = JSON.parse(msg.content.toString());

        await Promise.all([
          analytics.incrementRevenue(event.totalAmount),
          analytics.incrementOrders(),
          analytics.recordDailyRevenue(event.totalAmount),
        ]);

        if (event.items) {
          await Promise.all(
            event.items.map((item) => analytics.incrementBestSeller(item.productId, item.quantity)),
          );
        }

        ch.ack(msg);
      } catch (err) {
        console.error("Analytics worker error:", err);
        ch.nack(msg, false, true);
      }
    });

    console.log(`Analytics worker listening on queue: ${QUEUE}`);
  };
}
```

- [ ] **Step 2: Update worker entry point**

```typescript
// backend/src/infrastructure/workers/index.ts
import { redis } from "../../config/redis";
import { startInventoryWorker } from "../rabbitmq/consumers/inventory-worker";
import { startPaymentWorker } from "../rabbitmq/consumers/payment-worker";
import { startNotificationWorker } from "../rabbitmq/consumers/notification-worker";
import { createAnalyticsWorker } from "../rabbitmq/consumers/analytics-worker";

export async function startWorkers(): Promise<void> {
  console.log("Starting workers...");
  await startInventoryWorker();
  await startPaymentWorker();
  await startNotificationWorker();
  await createAnalyticsWorker(redis)();
  console.log("All workers started.");
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/rabbitmq/consumers/analytics-worker.ts backend/src/infrastructure/workers/index.ts
git commit -m "feat(backend): add analytics worker consuming payment.completed events"
```

---

### Task 3: Create admin analytics controller and routes

**Files:**
- Create: `backend/src/presentation/controllers/admin-controller.ts`
- Create: `backend/src/presentation/routes/admin.ts`

- [ ] **Step 1: Create AdminController**

```typescript
// backend/src/presentation/controllers/admin-controller.ts
import type { Request, Response, NextFunction } from "express";
import type { Redis } from "ioredis";
import { createAnalyticsStore } from "../../infrastructure/redis/analytics-store";

/** Creates the admin controller with analytics endpoint. */
export function createAdminController(redis: Redis) {
  const analytics = createAnalyticsStore(redis);

  return {
    /** GET /admin/analytics - Returns analytics data. Requires admin role. */
    async getAnalytics(_req: Request, res: Response, next: NextFunction) {
      try {
        const result = await analytics.getAnalytics();
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
```

- [ ] **Step 2: Create admin routes**

```typescript
// backend/src/presentation/routes/admin.ts
import { Router } from "express";
import type { Redis } from "ioredis";
import { createAdminController } from "../controllers/admin-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

/** Creates the admin router with analytics and admin-only endpoints. */
export function createAdminRouter(redis: Redis): Router {
  const controller = createAdminController(redis);
  const router = Router();

  router.use(authMiddleware, rbacMiddleware("admin"));

  router.get("/analytics", controller.getAnalytics);

  return router;
}
```

- [ ] **Step 3: Wire admin routes into Express app**

```typescript
// backend/src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { redis } from "./config/redis";
import { errorHandler } from "./presentation/middleware/error-handler";
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
app.use("/admin", createAdminRouter(redis));

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/admin-controller.ts backend/src/presentation/routes/admin.ts backend/src/index.ts
git commit -m "feat(backend): add admin analytics endpoint and wire routes"
```

---

### Task 4: Write analytics worker and admin API tests

**Files:**
- Create: `backend/src/tests/analytics-worker.test.ts`
- Create: `backend/src/tests/admin-analytics.test.ts`

- [ ] **Step 1: Create analytics worker test**

```typescript
// backend/src/tests/analytics-worker.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { redis } from "../config/redis";
import { randomUUID } from "node:crypto";

vi.mock("../config/rabbitmq", () => ({
  getRabbitChannel: vi.fn().mockResolvedValue({
    assertQueue: vi.fn(),
    bindQueue: vi.fn(),
    consume: vi.fn(),
    ack: vi.fn(),
    nack: vi.fn(),
    publish: vi.fn(),
  }),
  publishEvent: vi.fn().mockResolvedValue(undefined),
  closeRabbit: vi.fn(),
}));

import { startAnalyticsWorker } from "../infrastructure/rabbitmq/consumers/analytics-worker";
import { AnalyticsStore } from "../infrastructure/redis/analytics-store";
import type { Channel, ConsumeMessage } from "amqplib";

const analytics = new AnalyticsStore();

describe("Analytics Worker", () => {
  const productId = randomUUID();
  const productId2 = randomUUID();

  beforeEach(async () => {
    await redis.flushdb();
  });

  it("increments revenue and total orders on payment.completed event", async () => {
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event = {
      orderId: randomUUID(),
      userId: randomUUID(),
      paymentId: randomUUID(),
      totalAmount: "59.99",
      items: [{ productId, quantity: 2, subtotal: "59.98" }],
      timestamp: new Date().toISOString(),
    };

    const msg = { content: Buffer.from(JSON.stringify(event)) } as ConsumeMessage;
    await consumeHandler(msg);

    const result = await analytics.getAnalytics();
    expect(result.revenue).toBe(59.99);
    expect(result.totalOrders).toBe(1);
  });

  it("tracks best sellers and daily revenue", async () => {
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event1 = {
      orderId: randomUUID(),
      userId: randomUUID(),
      paymentId: randomUUID(),
      totalAmount: "29.99",
      items: [{ productId, quantity: 3, subtotal: "29.99" }],
      timestamp: new Date().toISOString(),
    };

    const event2 = {
      orderId: randomUUID(),
      userId: randomUUID(),
      paymentId: randomUUID(),
      totalAmount: "49.99",
      items: [{ productId: productId2, quantity: 1, subtotal: "49.99" }],
      timestamp: new Date().toISOString(),
    };

    await consumeHandler({ content: Buffer.from(JSON.stringify(event1)) } as ConsumeMessage);
    await consumeHandler({ content: Buffer.from(JSON.stringify(event2)) } as ConsumeMessage);

    const result = await analytics.getAnalytics();
    expect(result.revenue).toBe(79.98);
    expect(result.totalOrders).toBe(2);

    // productId (qty 3) should rank higher than productId2 (qty 1)
    expect(result.bestSellers[0].productId).toBe(productId);
    expect(result.bestSellers[0].score).toBe(3);

    expect(result.dailyRevenue.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Create admin analytics endpoint test**

```typescript
// backend/src/tests/admin-analytics.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { redis } from "../config/redis";
import { db } from "../config/database";
import { users } from "../infrastructure/database/drizzle/schema/users";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("Admin Analytics API", () => {
  const adminEmail = `admin-${randomUUID()}@example.com`;
  let adminToken = "";
  let customerToken = "";

  beforeAll(async () => {
    await redis.flushdb();

    // Seed some analytics data
    await redis.set("analytics:revenue", "1234.50");
    await redis.set("analytics:total_orders", "42");
    await redis.zincrby("analytics:best_sellers", 10, "prod-1");
    await redis.zincrby("analytics:best_sellers", 5, "prod-2");

    // Create admin
    const adminRes = await request(app)
      .post("/auth/register")
      .send({ name: "Admin", email: adminEmail, password: "password123" });
    adminToken = adminRes.body.accessToken;
    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.email, adminEmail));

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

  it("returns analytics for admin", async () => {
    const res = await request(app)
      .get("/admin/analytics")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.revenue).toBe(1234.5);
    expect(res.body.totalOrders).toBe(42);
    expect(res.body.bestSellers).toHaveLength(2);
    expect(res.body.bestSellers[0].productId).toBe("prod-1");
  });

  it("rejects non-admin access", async () => {
    const res = await request(app)
      .get("/admin/analytics")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/admin/analytics");
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new analytics worker and admin analytics tests.

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/analytics-worker.test.ts backend/src/tests/admin-analytics.test.ts
git commit -m "feat(backend): add analytics worker and admin analytics tests"
```

---

## Acceptance Criteria
- [ ] Analytics worker consumes from `analytics` queue bound to `payment.completed`
- [ ] Worker increments revenue in Redis on each event
- [ ] Worker increments total orders counter
- [ ] Worker updates best seller sorted set with product quantities
- [ ] Worker records daily revenue
- [ ] GET /admin/analytics returns revenue, totalOrders, bestSellers, dailyRevenue
- [ ] GET /admin/analytics requires admin role
- [ ] All tests pass

## Test Plan
- **Integration (DB-only for auth + Redis, RabbitMQ mocked):** Analytics worker data flow (revenue, orders, best sellers, daily revenue), admin analytics endpoint (RBAC for admin, rejection for customer and unauthenticated)
