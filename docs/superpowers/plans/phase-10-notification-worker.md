# Phase 10: Notification Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume payment and inventory events, create in-app notification records, and expose notification endpoints for users to fetch and mark notifications as read.

**Architecture:** Drizzle schema (notifications) → Domain entity (Notification) → Repository interface → Drizzle implementation → RabbitMQ consumer (notification worker). Worker listens on the `notification.send` queue bound to `payment.completed`, `inventory.failed`, `order.shipped`, `order.completed` routing keys. Two new use cases (ListNotifications, MarkRead) and a controller/routes provide the user API.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, RabbitMQ (amqplib), Zod, Vitest

---

### Task 1: Create notifications Drizzle schema

**Files:**
- Create: `backend/src/infrastructure/database/drizzle/schema/notifications.ts`
- Modify: `backend/src/infrastructure/database/drizzle/schema/index.ts`

- [ ] **Step 1: Create notifications table schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/notifications.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 30 }).notNull(), // "order_confirmed"|"payment_success"|"shipping"|"delivered"|"order_cancelled"
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Update schema index**

```typescript
// backend/src/infrastructure/database/drizzle/schema/index.ts
export { users } from "./users";
export { categories } from "./categories";
export { products } from "./products";
export { orders } from "./orders";
export { orderItems } from "./order-items";
export { inventoryLogs } from "./inventory-logs";
export { payments } from "./payments";
export { notifications } from "./notifications";
```

- [ ] **Step 3: Generate migration**

Run: `cd backend && npx drizzle-kit generate`
Expected: Migration file created in `src/infrastructure/database/drizzle/migrations/` with notifications DDL.

Run: `cd backend && npx drizzle-kit migrate`
Expected: notifications table created in PostgreSQL.

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/drizzle/schema/notifications.ts backend/src/infrastructure/database/drizzle/schema/index.ts backend/src/infrastructure/database/drizzle/migrations/
git commit -m "feat(backend): add notifications Drizzle schema and migration"
```

---

### Task 2: Create Notification domain entity and repository interface

**Files:**
- Create: `backend/src/domain/notifications/entities/notification.ts`
- Create: `backend/src/domain/notifications/repositories/notification-repository.ts`

- [ ] **Step 1: Create Notification entity**

```typescript
// backend/src/domain/notifications/entities/notification.ts

/** An in-app notification for a user. */
export interface Notification {
  id: string;
  userId: string;
  type: "order_confirmed" | "payment_success" | "shipping" | "delivered" | "order_cancelled";
  title: string;
  body: string | null;
  read: boolean;
  createdAt: Date;
}

/** Creates a new unread Notification for a user. */
export function createNotification(props: {
  userId: string;
  type: Notification["type"];
  title: string;
  body: string | null;
}): Notification {
  return {
    id: crypto.randomUUID(),
    userId: props.userId,
    type: props.type,
    title: props.title,
    body: props.body,
    read: false,
    createdAt: new Date(),
  };
}
```

- [ ] **Step 2: Create INotificationRepository interface**

```typescript
// backend/src/domain/notifications/repositories/notification-repository.ts
import type { Notification } from "../entities/notification";

/** Repository interface for persisting and querying notifications. */
export interface INotificationRepository {
  /** Persists a new notification. */
  save(notification: Notification): Promise<void>;
  /** Returns a paginated list of notifications for a user, newest first. */
  findByUserId(userId: string, page?: number, limit?: number): Promise<{ data: Notification[]; total: number }>;
  /** Marks a single notification as read (scoped to the owning user). */
  markRead(id: string, userId: string): Promise<void>;
}
```

- [ ] **Step 3: Create directories**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\notifications\entities" -Force
New-Item -ItemType Directory -Path "$root\domain\notifications\repositories" -Force
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/notifications/
git commit -m "feat(backend): add Notification entity and repository interface"
```

---

### Task 3: Create DrizzleNotificationRepository

**Files:**
- Create: `backend/src/infrastructure/database/repositories/drizzle-notification-repo.ts`

- [ ] **Step 1: Create DrizzleNotificationRepository**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-notification-repo.ts
import { eq, desc, count, and } from "drizzle-orm";
import { db } from "../../../config/database";
import { notifications } from "../drizzle/schema/notifications";
import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";
import type { Notification } from "../../../domain/notifications/entities/notification";

function rowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.userId as string,
    type: row.type as Notification["type"],
    title: row.title as string,
    body: row.body as string | null,
    read: row.read as boolean,
    createdAt: row.createdAt as Date,
  };
}

/** Creates a Drizzle-backed notification repository. */
export function createDrizzleNotificationRepo(): INotificationRepository {
  return {
    async save(notification: Notification): Promise<void> {
      await db.insert(notifications).values({
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        read: notification.read,
        createdAt: notification.createdAt,
      });
    },

    async findByUserId(userId: string, page = 1, limit = 10): Promise<{ data: Notification[]; total: number }> {
      const offset = (page - 1) * limit;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, userId))
          .orderBy(desc(notifications.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(notifications).where(eq(notifications.userId, userId)),
      ]);

      return {
        data: rows.map(rowToNotification),
        total: Number(totalResult[0].value),
      };
    },

    async markRead(id: string, userId: string): Promise<void> {
      await db
        .update(notifications)
        .set({ read: true })
        .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/repositories/drizzle-notification-repo.ts
git commit -m "feat(backend): add createDrizzleNotificationRepo"
```

---

### Task 4: Create notification use cases

**Files:**
- Create: `backend/src/application/notifications/use-cases/list-notifications.ts`
- Create: `backend/src/application/notifications/use-cases/mark-read.ts`

- [ ] **Step 1: Create ListNotifications use case**

```typescript
// backend/src/application/notifications/use-cases/list-notifications.ts
import { z } from "zod";
import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";

const schema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

/** Creates a use case that returns a paginated list of notifications for the current user. */
export function createListNotifications(notifRepo: INotificationRepository) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    return notifRepo.findByUserId(data.userId, data.page, data.limit);
  };
}
```

- [ ] **Step 2: Create MarkRead use case**

```typescript
// backend/src/application/notifications/use-cases/mark-read.ts
import { z } from "zod";
import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";

const schema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

/** Creates a use case that marks a single notification as read. */
export function createMarkRead(notifRepo: INotificationRepository) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    await notifRepo.markRead(data.id, data.userId);
  };
}
```

- [ ] **Step 3: Create directory**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\application\notifications\use-cases" -Force
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/notifications/use-cases/
git commit -m "feat(backend): add notification use cases (list, mark read)"
```

---

### Task 5: Create notification controller and routes

**Files:**
- Create: `backend/src/presentation/controllers/notification-controller.ts`
- Create: `backend/src/presentation/routes/notifications.ts`

- [ ] **Step 1: Create NotificationController**

```typescript
// backend/src/presentation/controllers/notification-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../../shared/errors/app-error";

/** Creates the notification controller with list and markRead handlers. */
export function createNotificationController(
  listNotifications: ReturnType<typeof import("../../application/notifications/use-cases/list-notifications").createListNotifications>,
  markRead: ReturnType<typeof import("../../application/notifications/use-cases/mark-read").createMarkRead>,
) {
  /** GET /notifications — returns paginated notifications for the authenticated user. Throws ValidationError on invalid query params. */
  const list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await listNotifications({
        userId: req.user!.sub,
        page: req.query.page as string,
        limit: req.query.limit as string,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
      }
      next(err);
    }
  };

  /** PATCH /notifications/:id/read — marks a notification as read. Throws ValidationError on invalid params. */
  const markReadHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await markRead({
        id: req.params.id,
        userId: req.user!.sub,
      });
      res.status(204).send();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
      }
      next(err);
    }
  };

  return { list, markRead: markReadHandler };
}
```

- [ ] **Step 2: Create notification routes**

```typescript
// backend/src/presentation/routes/notifications.ts
import { Router } from "express";
import { createDrizzleNotificationRepo } from "../../infrastructure/database/repositories/drizzle-notification-repo";
import { createListNotifications } from "../../application/notifications/use-cases/list-notifications";
import { createMarkRead } from "../../application/notifications/use-cases/mark-read";
import { createNotificationController } from "../controllers/notification-controller";
import { authMiddleware } from "../middleware/auth";

const notifRepo = createDrizzleNotificationRepo();
const listNotifications = createListNotifications(notifRepo);
const markRead = createMarkRead(notifRepo);
const controller = createNotificationController(listNotifications, markRead);

const router = Router();

router.use(authMiddleware);

router.get("/", controller.list);
router.patch("/:id/read", controller.markRead);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/notification-controller.ts backend/src/presentation/routes/notifications.ts
git commit -m "feat(backend): add notification controller and routes"
```

---

### Task 6: Create notification worker

**Files:**
- Create: `backend/src/infrastructure/rabbitmq/consumers/notification-worker.ts`

- [ ] **Step 1: Create notification worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/notification-worker.ts
import type { Channel } from "amqplib";
import { randomUUID } from "node:crypto";
import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";

const QUEUE = "notification.send";
const BINDING_KEYS = ["payment.completed", "inventory.failed", "order.shipped", "order.completed"];

interface EventPayload {
  orderId: string;
  userId: string;
  reason?: string;
  timestamp: string;
}

interface NotificationTemplate {
  type: "order_confirmed" | "payment_success" | "shipping" | "delivered" | "order_cancelled";
  title: string;
  body: (e: EventPayload) => string;
}

const notificationMap: Record<string, NotificationTemplate> = {
  "payment.completed": {
    type: "payment_success",
    title: "Payment Successful",
    body: (e) => `Your payment for order ${e.orderId.slice(0, 8)} was successful.`,
  },
  "inventory.failed": {
    type: "order_cancelled",
    title: "Order Cancelled",
    body: (e) => `Order ${e.orderId.slice(0, 8)} was cancelled due to insufficient stock.`,
  },
  "order.shipped": {
    type: "shipping",
    title: "Order Shipped",
    body: (e) => `Your order ${e.orderId.slice(0, 8)} has been shipped.`,
  },
  "order.completed": {
    type: "delivered",
    title: "Order Delivered",
    body: (e) => `Your order ${e.orderId.slice(0, 8)} has been delivered.`,
  },
};

/** Creates the notification worker that consumes payment/inventory events and persists in-app notifications. */
export function createNotificationWorker(notifRepo: INotificationRepository) {
  /** Starts consuming from the notification.send queue bound to payment, inventory, and order events. */
  return async (channel: Channel): Promise<void> => {
    await channel.assertQueue(QUEUE, { durable: true });

    for (const key of BINDING_KEYS) {
      await channel.bindQueue(QUEUE, "shop.exchange", key);
    }

    await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const routingKey = msg.fields.routingKey;
        const event: EventPayload = JSON.parse(msg.content.toString());
        const template = notificationMap[routingKey];
        if (!template) {
          channel.ack(msg);
          return;
        }

        const notification = {
          id: randomUUID(),
          userId: event.userId,
          type: template.type,
          title: template.title,
          body: template.body(event),
          read: false,
          createdAt: new Date(),
        };

        await notifRepo.save(notification);

        // ponytail: console log as email mock, integrate real email provider when needed
        console.log(`[EMAIL] To: user ${event.userId} | Subject: ${template.title} | Body: ${template.body(event)}`);

        channel.ack(msg);
      } catch (err) {
        console.error("Notification worker error:", err);
        channel.nack(msg, false, true);
      }
    });

    console.log(`Notification worker listening on queue: ${QUEUE}`);
  };
}
```

- [ ] **Step 2: Update worker entry point**

```typescript
// backend/src/infrastructure/workers/index.ts
import { getRabbitChannel } from "../../config/rabbitmq";
import { publishEvent } from "../../config/rabbitmq";
import { createDrizzleInventoryRepo } from "../database/repositories/drizzle-inventory-repo";
import { createDrizzlePaymentRepo } from "../database/repositories/drizzle-payment-repo";
import { createDrizzleNotificationRepo } from "../database/repositories/drizzle-notification-repo";
import { createInventoryWorker } from "../rabbitmq/consumers/inventory-worker";
import { createPaymentWorker } from "../rabbitmq/consumers/payment-worker";
import { createNotificationWorker } from "../rabbitmq/consumers/notification-worker";

/** Starts all workers. */
export async function startWorkers(): Promise<void> {
  console.log("Starting workers...");
  const channel = await getRabbitChannel();
  const inventoryWorker = createInventoryWorker(createDrizzleInventoryRepo(), publishEvent);
  const paymentWorker = createPaymentWorker(createDrizzlePaymentRepo(), publishEvent);
  const notificationWorker = createNotificationWorker(createDrizzleNotificationRepo());
  await inventoryWorker(channel);
  await paymentWorker(channel);
  await notificationWorker(channel);
  console.log("All workers started.");
}
```

- [ ] **Step 3: Wire notification routes into Express app**

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
import checkoutRoutes from "./presentation/routes/checkout";
import orderRoutes from "./presentation/routes/orders";
import notificationRoutes from "./presentation/routes/notifications";

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

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/rabbitmq/consumers/notification-worker.ts backend/src/infrastructure/workers/index.ts backend/src/index.ts
git commit -m "feat(backend): add notification worker and wire routes"
```

---

### Task 7: Write notification worker and API tests

**Files:**
- Create: `backend/src/tests/notification-worker.test.ts`

- [ ] **Step 1: Create notification worker test file**

```typescript
// backend/src/tests/notification-worker.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { notifications } from "../infrastructure/database/drizzle/schema/notifications";
import { users } from "../infrastructure/database/drizzle/schema/users";
import { eq } from "drizzle-orm";
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

vi.mock("../infrastructure/database/repositories/drizzle-notification-repo", () => ({
  createDrizzleNotificationRepo: vi.fn(() => ({
    save: vi.fn().mockResolvedValue(undefined),
    findByUserId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    markRead: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { createNotificationWorker } from "../infrastructure/rabbitmq/consumers/notification-worker";
import type { Channel, ConsumeMessage } from "amqplib";

describe("Notification Worker", () => {
  const userId = randomUUID();
  const orderId = randomUUID();
  let token = "";

  beforeEach(async () => {
    await db.insert(users).values({
      id: userId,
      email: `notif-${randomUUID()}@example.com`,
      passwordHash: "hash",
      name: "Test User",
      role: "customer",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "admin@example.com", password: "password" });
    token = res.body.accessToken || "";
  });

  it("creates a notification on payment.completed event", async () => {
    const mockRepo = (await import("../infrastructure/database/repositories/drizzle-notification-repo")).createDrizzleNotificationRepo();
    const worker = createNotificationWorker(mockRepo);
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    await worker(ch);

    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event = { orderId, userId, timestamp: new Date().toISOString() };
    const msg = {
      content: Buffer.from(JSON.stringify(event)),
      fields: { routingKey: "payment.completed" },
    } as ConsumeMessage;

    await consumeHandler(msg);

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId, type: "payment_success", title: "Payment Successful" }),
    );
  });

  it("creates a notification on inventory.failed event", async () => {
    const mockRepo = (await import("../infrastructure/database/repositories/drizzle-notification-repo")).createDrizzleNotificationRepo();
    const worker = createNotificationWorker(mockRepo);
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    await worker(ch);

    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event = { orderId, userId, reason: "insufficient_stock", timestamp: new Date().toISOString() };
    const msg = {
      content: Buffer.from(JSON.stringify(event)),
      fields: { routingKey: "inventory.failed" },
    } as ConsumeMessage;

    await consumeHandler(msg);

    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId, type: "order_cancelled", title: "Order Cancelled" }),
    );
  });

  it("GET /notifications returns user notifications", async () => {
    // Insert a notification directly
    await db.insert(notifications).values({
      id: randomUUID(),
      userId,
      type: "payment_success",
      title: "Test Notification",
      body: "Test body",
      read: false,
      createdAt: new Date(),
    });

    // Use registration + login to get a real token for this user
    const email = `test-${randomUUID()}@example.com`;
    const regRes = await request(app)
      .post("/auth/register")
      .send({ name: "Test", email, password: "password123" });
    const userToken = regRes.body.accessToken;
    const userIdFromReg = regRes.body.user?.id;

    // Update notification to real user
    await db
      .update(notifications)
      .set({ userId: userIdFromReg })
      .where(eq(notifications.type, "payment_success"));

    const res = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new notification worker tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/notification-worker.test.ts
git commit -m "feat(backend): add notification worker and API tests"
```

---

## Acceptance Criteria
- [ ] notifications table exists with FK to users
- [ ] Notification worker consumes from `notification.send` queue bound to `payment.completed`, `inventory.failed`, `order.shipped`, `order.completed`
- [ ] Worker creates in-app notification for each event type
- [ ] Worker logs email mock to console
- [ ] GET /notifications returns authenticated user's notifications (paginated)
- [ ] PATCH /notifications/:id/read marks notification as read
- [ ] All tests pass

## Test Plan
- **Integration (supertest + DB, RabbitMQ mocked):** Worker creates notifications for payment_success and order_cancelled events, notification listing endpoint, mark-as-read endpoint
