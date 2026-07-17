# Phase 13: Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the backend for production — add retry strategy with DLX, idempotent consumers, optimistic locking for stock, request logging, comprehensive error handling, graceful shutdown, input validation middleware, and env var validation.

**Architecture:** Cross-cutting concerns applied to existing infrastructure: RabbitMQ setup gets DLX configuration, Redis gets idempotency helper, products table gets version column for optimistic locking, Express pipeline gets request logger and Zod validation middleware, server entry point gets graceful shutdown handlers.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, Redis (ioredis), RabbitMQ (amqplib), Zod, Vitest

---

### Task 1: Create environment validation schema

**Files:**
- Modify: `backend/src/config/env.ts`

- [ ] **Step 1: Add Zod env validation**

```typescript
// backend/src/config/env.ts
import { z } from "zod";

/** Zod schema for validating environment variables at startup. */
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RABBITMQ_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/config/env.ts
git commit -m "feat(backend): add Zod env validation at startup"
```

---

### Task 2: Create request logging middleware

**Files:**
- Create: `backend/src/presentation/middleware/request-logger.ts`

- [ ] **Step 1: Create requestLogger middleware**

```typescript
// backend/src/presentation/middleware/request-logger.ts
import type { Request, Response, NextFunction } from "express";

/** Express middleware that logs every request with method, path, status, duration, and userId in JSON format. */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.id ?? "anonymous";
    console.log(
      JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        duration: `${duration}ms`,
        userId,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  next();
}
```

- [ ] **Step 2: Wire into app**

```typescript
// backend/src/index.ts (add after app.use(express.json()))
import { requestLogger } from "./presentation/middleware/request-logger";
app.use(requestLogger);
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/middleware/request-logger.ts backend/src/index.ts
git commit -m "feat(backend): add request logging middleware"
```

---

### Task 3: Create Redis-based idempotency helper

**Files:**
- Create: `backend/src/infrastructure/redis/idempotency.ts`

- [ ] **Step 1: Create IdempotencyStore**

```typescript
// backend/src/infrastructure/redis/idempotency.ts
import type { Redis } from "ioredis";

// ponytail: 24h TTL is generous for at-least-once delivery, tune when event volume grows
const IDEMPOTENCY_TTL = 60 * 60 * 24; // 24 hours

/** Creates an idempotency store backed by Redis for deduplicating event processing. */
export function createIdempotencyStore(redis: Redis) {
  return {
    /** Returns true if the event has already been processed. */
    async isProcessed(eventId: string): Promise<boolean> {
      const exists = await redis.get(`idempotency:${eventId}`);
      return exists !== null;
    },

    /** Marks an event as processed with a 24-hour TTL. */
    async markProcessed(eventId: string): Promise<void> {
      await redis.set(`idempotency:${eventId}`, "1", "EX", IDEMPOTENCY_TTL);
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/redis/idempotency.ts
git commit -m "feat(backend): add Redis-based idempotency helper"
```

---

### Task 4: Update RabbitMQ setup with DLX for all queues

**Files:**
- Modify: `backend/src/config/rabbitmq.ts`

- [ ] **Step 1: Add DLX exchange and queue setup**

```typescript
// backend/src/config/rabbitmq.ts
import amqplib from "amqplib";
import { env } from "./env";

let connection: amqplib.Connection | null = null;
let channel: amqplib.Channel | null = null;

const queues = ["order.created", "inventory.reserved", "payment.completed", "inventory.failed", "order.shipped", "order.completed", "notification.send", "analytics"];

/** Gets or creates a RabbitMQ channel with DLX configured for all queues. */
export async function getRabbitChannel(): Promise<amqplib.Channel> {
  if (channel) return channel;

  connection = await amqplib.connect(env.RABBITMQ_URL);
  channel = await connection.createChannel();

  // Main exchange
  await channel.assertExchange("shop.exchange", "topic", { durable: true });

  // Dead letter exchange
  await channel.assertExchange("shop.dlx", "topic", { durable: true });

  for (const queue of queues) {
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "shop.dlx",
        "x-dead-letter-routing-key": queue,
      },
    });
    await channel.bindQueue(queue, "shop.exchange", queue);
  }

  // Dead letter queue — messages routed here after DLX
  await channel.assertQueue("dead-letter", { durable: true });
  await channel.bindQueue("dead-letter", "shop.dlx", "#");

  console.log("RabbitMQ channel ready with DLX configured");
  return channel;
}

/** Publishes an event to the shop.exchange with the given routing key. */
export async function publishEvent(routingKey: string, payload: object): Promise<void> {
  const ch = await getRabbitChannel();
  ch.publish("shop.exchange", routingKey, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
  });
}

/** Closes the RabbitMQ connection and channel gracefully. */
export async function closeRabbit(): Promise<void> {
  try {
    await channel?.close();
    await connection?.close();
  } catch {
    // ignore close errors
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/config/rabbitmq.ts
git commit -m "feat(backend): configure DLX for all queues with dead-letter queue"
```

---

### Task 5: Add version column to products for optimistic locking

**Files:**
- Modify: `backend/src/infrastructure/database/drizzle/schema/products.ts`
- Modify: `backend/src/domain/products/entities/product.ts`
- Modify: `backend/src/infrastructure/database/repositories/drizzle-product-repo.ts`

- [ ] **Step 1: Add version column to products schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/products.ts
import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { categories } from "./categories";

/** Products table schema with optimistic locking via version column. */
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  isActive: boolean("is_active").notNull().default(true),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add version field to Product entity**

```typescript
// backend/src/domain/products/entities/product.ts
/** Product entity representing a product in the catalog with optimistic locking. */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  stock: number;
  categoryId: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 3: Add optimistic locking to the product repository update**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-product-repo.ts
// Inside DrizzleProductRepository.update method — add version check

/** Updates a product with optimistic locking. @throws Error if version conflict detected. */
async update(id: string, data: Partial<Omit<Product, "id" | "createdAt">>): Promise<Product | null> {
  const existing = await this.findById(id);
  if (!existing) return null;

  const result = await this.db
    .update(products)
    .set({
      ...data,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(products.id, id))
    .where(eq(products.version, existing.version))
    .returning();

  if (result.length === 0) {
    throw new Error("Optimistic lock conflict: product was modified by another request");
  }

  return this.toDomain(result[0]);
}
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/drizzle/schema/products.ts backend/src/domain/products/entities/product.ts backend/src/infrastructure/database/repositories/drizzle-product-repo.ts
git commit -m "feat(backend): add version-based optimistic locking to products"
```

---

### Task 6: Update all workers with idempotency checks and proper error handling

**Files:**
- Modify: `backend/src/infrastructure/rabbitmq/consumers/inventory-worker.ts`
- Modify: `backend/src/infrastructure/rabbitmq/consumers/payment-worker.ts`
- Modify: `backend/src/infrastructure/rabbitmq/consumers/notification-worker.ts`
- Modify: `backend/src/infrastructure/rabbitmq/consumers/analytics-worker.ts`

- [ ] **Step 1: Update inventory worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/inventory-worker.ts
import { getRabbitChannel } from "../../../config/rabbitmq";
import { redis } from "../../../config/redis";
import { createIdempotencyStore } from "../../redis/idempotency";

const QUEUE = "order.created";
const ROUTING_KEY = "order.created";

const idempotency = createIdempotencyStore(redis);

interface OrderCreatedEvent {
  eventId: string;
  orderId: string;
  userId: string;
  items: { productId: string; quantity: number }[];
  timestamp: string;
}

/** Starts the inventory worker that reserves stock on order.created events. */
export async function startInventoryWorker(): Promise<void> {
  const ch = await getRabbitChannel();
  await ch.assertQueue(QUEUE, { durable: true });
  await ch.bindQueue(QUEUE, "shop.exchange", ROUTING_KEY);

  await ch.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event: OrderCreatedEvent = JSON.parse(msg.content.toString());

      if (!event.eventId) {
        console.error("Inventory worker: missing eventId, nacking");
        ch.nack(msg, false, false);
        return;
      }

      if (await idempotency.isProcessed(event.eventId)) {
        ch.ack(msg);
        return;
      }

      // ... existing stock validation and reduction logic ...

      await idempotency.markProcessed(event.eventId);
      ch.ack(msg);
    } catch (err) {
      console.error("Inventory worker error:", err);
      // ponytail: nack without requeue so DLX picks it up; add retry count check later
      ch.nack(msg, false, false);
    }
  });

  console.log(`Inventory worker listening on queue: ${QUEUE}`);
}
```

- [ ] **Step 2: Update payment worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/payment-worker.ts
import { getRabbitChannel } from "../../../config/rabbitmq";
import { redis } from "../../../config/redis";
import { createIdempotencyStore } from "../../redis/idempotency";

const QUEUE = "inventory.reserved";
const ROUTING_KEY = "inventory.reserved";

const idempotency = createIdempotencyStore(redis);

interface InventoryReservedEvent {
  eventId: string;
  orderId: string;
  userId: string;
  totalAmount: string;
  items: { productId: string; quantity: number; subtotal: string }[];
  timestamp: string;
}

/** Starts the payment worker that processes payments on inventory.reserved events. */
export async function startPaymentWorker(): Promise<void> {
  const ch = await getRabbitChannel();
  await ch.assertQueue(QUEUE, { durable: true });
  await ch.bindQueue(QUEUE, "shop.exchange", ROUTING_KEY);

  await ch.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event: InventoryReservedEvent = JSON.parse(msg.content.toString());

      if (!event.eventId) {
        console.error("Payment worker: missing eventId, nacking");
        ch.nack(msg, false, false);
        return;
      }

      if (await idempotency.isProcessed(event.eventId)) {
        ch.ack(msg);
        return;
      }

      // ... existing mock payment logic (90/10 success/fail) ...

      await idempotency.markProcessed(event.eventId);
      ch.ack(msg);
    } catch (err) {
      console.error("Payment worker error:", err);
      ch.nack(msg, false, false);
    }
  });

  console.log(`Payment worker listening on queue: ${QUEUE}`);
}
```

- [ ] **Step 3: Update notification worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/notification-worker.ts
import { getRabbitChannel } from "../../../config/rabbitmq";
import { redis } from "../../../config/redis";
import { createIdempotencyStore } from "../../redis/idempotency";

const QUEUE = "notification.send";
const ROUTING_KEYS = ["payment.completed", "inventory.failed", "order.shipped", "order.completed"];

const idempotency = createIdempotencyStore(redis);

interface NotificationEvent {
  eventId: string;
  type: "payment.completed" | "inventory.failed" | "order.shipped" | "order.completed";
  userId: string;
  orderId: string;
  message?: string;
  timestamp: string;
}

/** Starts the notification worker that sends notifications on various order events. */
export async function startNotificationWorker(): Promise<void> {
  const ch = await getRabbitChannel();
  await ch.assertQueue(QUEUE, { durable: true });
  for (const key of ROUTING_KEYS) {
    await ch.bindQueue(QUEUE, "shop.exchange", key);
  }

  await ch.consume(QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event: NotificationEvent = JSON.parse(msg.content.toString());

      if (!event.eventId) {
        console.error("Notification worker: missing eventId, nacking");
        ch.nack(msg, false, false);
        return;
      }

      if (await idempotency.isProcessed(event.eventId)) {
        ch.ack(msg);
        return;
      }

      // ... existing notification creation logic ...

      await idempotency.markProcessed(event.eventId);
      ch.ack(msg);
    } catch (err) {
      console.error("Notification worker error:", err);
      ch.nack(msg, false, false);
    }
  });

  console.log(`Notification worker listening on queue: ${QUEUE}`);
}
```

- [ ] **Step 4: Update analytics worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/analytics-worker.ts
import { getRabbitChannel } from "../../../config/rabbitmq";
import type { Redis } from "ioredis";
import { createAnalyticsStore } from "../../redis/analytics-store";
import { createIdempotencyStore } from "../../redis/idempotency";

const QUEUE = "analytics";
const ROUTING_KEY = "payment.completed";

/** Payment completed event with idempotency key. */
interface PaymentCompletedEvent {
  eventId: string;
  orderId: string;
  userId: string;
  paymentId: string;
  totalAmount: string;
  items?: { productId: string; quantity: number; subtotal: string }[];
  timestamp: string;
}

/** Creates the analytics worker with idempotency checks, consuming payment.completed events. */
export function createAnalyticsWorker(redis: Redis) {
  const analytics = createAnalyticsStore(redis);
  const idempotency = createIdempotencyStore(redis);

  return async function startAnalyticsWorker(): Promise<void> {
    const ch = await getRabbitChannel();
    await ch.assertQueue(QUEUE, { durable: true });
    await ch.bindQueue(QUEUE, "shop.exchange", ROUTING_KEY);

    await ch.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const event: PaymentCompletedEvent = JSON.parse(msg.content.toString());

        if (!event.eventId) {
          console.error("Analytics worker: missing eventId, nacking");
          ch.nack(msg, false, false);
          return;
        }

        if (await idempotency.isProcessed(event.eventId)) {
          ch.ack(msg);
          return;
        }

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

        await idempotency.markProcessed(event.eventId);
        ch.ack(msg);
      } catch (err) {
        console.error("Analytics worker error:", err);
        ch.nack(msg, false, false);
      }
    });

    console.log(`Analytics worker listening on queue: ${QUEUE}`);
  };
}
```

- [ ] **Step 5: Add eventId to publishEvent calls in checkout and payment use cases**

```typescript
// backend/src/application/checkout/use-cases/create-order.ts (publish section)
import { randomUUID } from "node:crypto";
// ...
await publishEvent("order.created", {
  eventId: randomUUID(),
  orderId: order.id,
  userId: userId,
  items: cartItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
  timestamp: new Date().toISOString(),
});

// backend/src/application/payment/use-cases/process-payment.ts (publish section)
await publishEvent("inventory.reserved", {
  eventId: randomUUID(),
  orderId: result.orderId,
  userId: result.userId,
  totalAmount: result.totalAmount,
  items: result.items,
  timestamp: new Date().toISOString(),
});
```

- [ ] **Step 6: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/rabbitmq/consumers/ backend/src/application/
git commit -m "feat(backend): add idempotency checks and DLX nack to all workers"
```

---

### Task 7: Create Zod validation middleware

**Files:**
- Create: `backend/src/presentation/middleware/validate.ts`

- [ ] **Step 1: Create validate middleware factory**

```typescript
// backend/src/presentation/middleware/validate.ts
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

/** Schemas to validate for a given route. */
interface ValidationSchemas {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

/** Creates Express middleware that validates request body, query, and/or params against Zod schemas. Returns 400 with structured errors on failure. */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as any;
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as any;
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation failed",
          details: err.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
```

- [ ] **Step 2: Apply validation to an example route**

```typescript
// Example: backend/src/presentation/routes/products.ts
import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { ProductController } from "../controllers/product-controller";

const router = Router();
const controller = new ProductController(/* deps */);

const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0).default(0),
  categoryId: z.string().uuid(),
});

const updateProductSchema = createProductSchema.partial();

router.post("/", validate({ body: createProductSchema }), controller.create);
router.patch("/:id", validate({ body: updateProductSchema }), controller.update);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/middleware/validate.ts
git commit -m "feat(backend): add Zod validation middleware factory"
```

---

### Task 8: Add graceful shutdown to server entry point

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add graceful shutdown handlers**

```typescript
// backend/src/index.ts (add after app.listen)

const server = app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

/** Handles graceful shutdown on SIGTERM/SIGINT — closes HTTP server, DB, Redis, and RabbitMQ connections. */
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log("HTTP server closed");
    await Promise.allSettled([
      import("./config/redis").then((m) => m.closeRedis()),
      import("./config/rabbitmq").then((m) => m.closeRabbit()),
      import("./config/database").then((m) => m.closeDb()),
    ]);
    console.log("All connections closed. Goodbye.");
    process.exit(0);
  });

  // Force exit after 10s
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export default app;
```

- [ ] **Step 2: Add closeDb helper to database config**

```typescript
// backend/src/config/database.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "./env";

const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool);

/** Closes the PostgreSQL connection pool. */
export async function closeDb(): Promise<void> {
  await pool.end();
}
```

- [ ] **Step 3: Add closeRedis helper to redis config**

```typescript
// backend/src/config/redis.ts
import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.REDIS_URL);

/** Closes the Redis connection gracefully. */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/index.ts backend/src/config/database.ts backend/src/config/redis.ts
git commit -m "feat(backend): add graceful shutdown with SIGTERM/SIGINT handlers"
```

---

### Task 9: Write production hardening tests

**Files:**
- Create: `backend/src/tests/production-hardening.test.ts`

- [ ] **Step 1: Create production hardening test file**

```typescript
// backend/src/tests/production-hardening.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdempotencyStore } from "../infrastructure/redis/idempotency";
import { redis } from "../config/redis";
import { validate } from "../presentation/middleware/validate";
import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

describe("Production Hardening", () => {
  describe("Environment Validation", () => {
    it("exports parsed env with defaults", () => {
      expect(env).toHaveProperty("PORT");
      expect(env).toHaveProperty("DATABASE_URL");
      expect(env).toHaveProperty("JWT_SECRET");
      expect(typeof env.PORT).toBe("number");
    });
  });

  describe("Idempotency Store", () => {
    const store = new IdempotencyStore();

    beforeEach(async () => {
      await redis.flushdb();
    });

    it("returns false for unprocessed event", async () => {
      const result = await store.isProcessed("unknown-event");
      expect(result).toBe(false);
    });

    it("returns true after marking as processed", async () => {
      await store.markProcessed("event-123");
      const result = await store.isProcessed("event-123");
      expect(result).toBe(true);
    });

    it("handles multiple events independently", async () => {
      await store.markProcessed("event-1");
      await store.markProcessed("event-2");
      expect(await store.isProcessed("event-1")).toBe(true);
      expect(await store.isProcessed("event-2")).toBe(true);
      expect(await store.isProcessed("event-3")).toBe(false);
    });
  });

  describe("Validation Middleware", () => {
    function mockReqRes(body?: any, query?: any, params?: any) {
      const req = { body, query, params } as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;
      const next = vi.fn() as NextFunction;
      return { req, res, next };
    }

    it("passes through valid body", () => {
      const schema = z.object({ name: z.string() });
      const handler = validate({ body: schema });
      const { req, res, next } = mockReqRes({ name: "test" });
      handler(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: "test" });
    });

    it("rejects invalid body with 400", () => {
      const schema = z.object({ name: z.string() });
      const handler = validate({ body: schema });
      const { req, res, next } = mockReqRes({ name: 123 });
      handler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Validation failed" }),
      );
    });

    it("validates query params", () => {
      const schema = z.object({ page: z.coerce.number().optional() });
      const handler = validate({ query: schema });
      const { req, res, next } = mockReqRes(undefined, { page: "2" });
      handler(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it("validates path params", () => {
      const schema = z.object({ id: z.string().uuid() });
      const handler = validate({ params: schema });
      const { req, res, next } = mockReqRes(undefined, undefined, { id: "not-a-uuid" });
      handler(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("Graceful Shutdown", () => {
    it("handles SIGTERM without throwing", () => {
      // Verify process listeners exist (set up in index.ts)
      const listeners = process.listeners("SIGTERM");
      expect(listeners.length).toBeGreaterThanOrEqual(1);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new production hardening tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/production-hardening.test.ts
git commit -m "test(backend): add production hardening tests for idempotency, validation, env"
```

---

## Acceptance Criteria
- [ ] Env validation: missing/invalid vars cause startup failure with clear messages
- [ ] Request logging: every request logs method, path, status, duration, userId in JSON
- [ ] Idempotency: each worker checks Redis before processing; same eventId is skipped after first ack
- [ ] DLX: all queues have `x-dead-letter-exchange: shop.dlx`; dead-letter queue receives nacked messages
- [ ] Optimistic locking: products table has `version` column; concurrent stock updates throw on conflict
- [ ] Worker error handling: all workers catch errors and nack with `requeue: false` (→ DLX)
- [ ] Validation middleware: rejects invalid body/query/params with 400 + structured error details
- [ ] Graceful shutdown: SIGTERM/SIGINT close HTTP server, DB pool, Redis, RabbitMQ connections
- [ ] All tests pass

## Test Plan
- **Unit:** IdempotencyStore (isProcessed true/false, markProcessed), validate middleware (valid passes, invalid 400, query/params validation), env defaults
- **Integration:** Full worker flow with idempotency (needs Redis + RabbitMQ running)
