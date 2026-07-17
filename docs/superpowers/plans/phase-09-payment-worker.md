# Phase 9: Payment Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume `inventory.reserved` events, simulate payment processing (90% success), update payment and order status, and publish corresponding events.

**Architecture:** Drizzle schema (payments) → Domain entity (Payment) → Repository interface → Drizzle implementation → RabbitMQ consumer (payment worker). Worker simulates a 2-second payment delay with a 90/10 success/failure ratio. On success, it updates the payment and order status to "paid" and publishes `payment.completed`. On failure, it publishes `payment.failed` and `inventory.release` to trigger stock rollback.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, RabbitMQ (amqplib), Vitest

---

### Task 1: Create payments Drizzle schema

**Files:**
- Create: `backend/src/infrastructure/database/drizzle/schema/payments.ts`
- Modify: `backend/src/infrastructure/database/drizzle/schema/index.ts`

- [ ] **Step 1: Create payments table schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/payments.ts
import { pgTable, uuid, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().unique().references(() => orders.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // "pending" | "success" | "failed"
  paidAt: timestamp("paid_at"),
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
```

- [ ] **Step 3: Generate migration**

Run: `cd backend && npx drizzle-kit generate`
Expected: Migration file created in `src/infrastructure/database/drizzle/migrations/` with payments DDL.

Run: `cd backend && npx drizzle-kit migrate`
Expected: payments table created in PostgreSQL.

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/drizzle/schema/payments.ts backend/src/infrastructure/database/drizzle/schema/index.ts backend/src/infrastructure/database/drizzle/migrations/
git commit -m "feat(backend): add payments Drizzle schema and migration"
```

---

### Task 2: Create Payment domain entity and repository interface

**Files:**
- Create: `backend/src/domain/payments/entities/payment.ts`
- Create: `backend/src/domain/payments/repositories/payment-repository.ts`

- [ ] **Step 1: Create Payment entity**

```typescript
// backend/src/domain/payments/entities/payment.ts

/** A payment record tied to an order. */
export interface Payment {
  id: string;
  orderId: string;
  amount: string;
  status: "pending" | "success" | "failed";
  paidAt: Date | null;
  createdAt: Date;
}

/** Creates a new pending Payment for the given order and amount. */
export function createPayment(props: { id: string; orderId: string; amount: string }): Payment {
  return {
    id: props.id,
    orderId: props.orderId,
    amount: props.amount,
    status: "pending",
    paidAt: null,
    createdAt: new Date(),
  };
}
```

- [ ] **Step 2: Create IPaymentRepository interface**

```typescript
// backend/src/domain/payments/repositories/payment-repository.ts
import type { Payment } from "../entities/payment";

/** Repository interface for persisting and querying payment records. */
export interface IPaymentRepository {
  /** Persists a new payment record. */
  save(payment: Payment): Promise<void>;
  /** Updates the status of a payment (and sets paidAt on success). */
  updateStatus(id: string, status: "success" | "failed"): Promise<void>;
  /** Finds a payment by its order ID, or null if not found. */
  findByOrderId(orderId: string): Promise<Payment | null>;
}
```

- [ ] **Step 3: Create directories**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\payments\entities" -Force
New-Item -ItemType Directory -Path "$root\domain\payments\repositories" -Force
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/payments/
git commit -m "feat(backend): add Payment entity and repository interface"
```

---

### Task 3: Create DrizzlePaymentRepository

**Files:**
- Create: `backend/src/infrastructure/database/repositories/drizzle-payment-repo.ts`

- [ ] **Step 1: Create DrizzlePaymentRepository**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-payment-repo.ts
import { eq } from "drizzle-orm";
import { db } from "../../../config/database";
import { payments } from "../drizzle/schema/payments";
import type { IPaymentRepository } from "../../../domain/payments/repositories/payment-repository";
import type { Payment } from "../../../domain/payments/entities/payment";

function rowToPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    orderId: row.orderId as string,
    amount: row.amount as string,
    status: row.status as Payment["status"],
    paidAt: row.paidAt as Date | null,
    createdAt: row.createdAt as Date,
  };
}

/** Creates a Drizzle-backed payment repository. */
export function createDrizzlePaymentRepo(): IPaymentRepository {
  return {
    async save(payment: Payment): Promise<void> {
      await db.insert(payments).values({
        id: payment.id,
        orderId: payment.orderId,
        amount: payment.amount,
        status: payment.status,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
      });
    },

    async updateStatus(id: string, status: "success" | "failed"): Promise<void> {
      const updates: Record<string, unknown> = { status };
      if (status === "success") {
        updates.paidAt = new Date();
      }
      await db.update(payments).set(updates).where(eq(payments.id, id));
    },

    async findByOrderId(orderId: string): Promise<Payment | null> {
      const [row] = await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
      if (!row) return null;
      return rowToPayment(row);
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/repositories/drizzle-payment-repo.ts
git commit -m "feat(backend): add createDrizzlePaymentRepo"
```

---

### Task 4: Create payment worker

**Files:**
- Create: `backend/src/infrastructure/rabbitmq/consumers/payment-worker.ts`

- [ ] **Step 1: Create payment worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/payment-worker.ts
import type { Channel } from "amqplib";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../../../config/database";
import { orders } from "../../database/drizzle/schema/orders";
import type { IPaymentRepository } from "../../../domain/payments/repositories/payment-repository";
import { createPayment } from "../../../domain/payments/entities/payment";

const QUEUE = "payment.request";
const ROUTING_KEY = "inventory.reserved";

interface InventoryReservedEvent {
  orderId: string;
  userId: string;
  totalAmount: string;
  items: { productId: string; quantity: number; subtotal: string }[];
  timestamp: string;
}

/** Creates the payment worker that consumes inventory.reserved events. */
export function createPaymentWorker(
  paymentRepo: IPaymentRepository,
  publish: (event: string, payload: Record<string, unknown>) => Promise<void>,
) {
  /** Starts consuming from the payment.request queue. Publishes payment.completed or payment.failed + inventory.release. */
  return async (channel: Channel): Promise<void> => {
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, "shop.exchange", ROUTING_KEY);

    await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const event: InventoryReservedEvent = JSON.parse(msg.content.toString());
        const paymentId = randomUUID();
        const payment = createPayment({ id: paymentId, orderId: event.orderId, amount: event.totalAmount });
        await paymentRepo.save(payment);

        // ponytail: setTimeout, replace with proper async when using real payment gateway
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // ponytail: fixed 90/10 ratio, make configurable when adding payment provider
        const success = Math.random() < 0.9;

        if (success) {
          await paymentRepo.updateStatus(paymentId, "success");
          await db
            .update(orders)
            .set({ status: "paid", updatedAt: new Date() })
            .where(eq(orders.id, event.orderId));

          await publish("payment.completed", {
            orderId: event.orderId,
            userId: event.userId,
            paymentId,
            totalAmount: event.totalAmount,
            timestamp: new Date().toISOString(),
          }).catch((err) => console.error("Failed to publish payment.completed event:", err));
        } else {
          await paymentRepo.updateStatus(paymentId, "failed");

          await publish("payment.failed", {
            orderId: event.orderId,
            userId: event.userId,
            paymentId,
            reason: "payment_declined",
            timestamp: new Date().toISOString(),
          }).catch((err) => console.error("Failed to publish payment.failed event:", err));

          await publish("inventory.release", {
            orderId: event.orderId,
            items: event.items,
            timestamp: new Date().toISOString(),
          }).catch((err) => console.error("Failed to publish inventory.release event:", err));
        }

        channel.ack(msg);
      } catch (err) {
        console.error("Payment worker error:", err);
        channel.nack(msg, false, true);
      }
    });

    console.log(`Payment worker listening on queue: ${QUEUE}`);
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
import { createInventoryWorker } from "../rabbitmq/consumers/inventory-worker";
import { createPaymentWorker } from "../rabbitmq/consumers/payment-worker";

/** Starts all workers. */
export async function startWorkers(): Promise<void> {
  console.log("Starting workers...");
  const channel = await getRabbitChannel();
  const inventoryWorker = createInventoryWorker(createDrizzleInventoryRepo(), publishEvent);
  const paymentWorker = createPaymentWorker(createDrizzlePaymentRepo(), publishEvent);
  await inventoryWorker(channel);
  await paymentWorker(channel);
  console.log("All workers started.");
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/rabbitmq/consumers/payment-worker.ts backend/src/infrastructure/workers/index.ts
git commit -m "feat(backend): add payment worker consuming inventory.reserved events"
```

---

### Task 5: Write payment worker tests

**Files:**
- Create: `backend/src/tests/payment-worker.test.ts`

- [ ] **Step 1: Create payment worker test file**

```typescript
// backend/src/tests/payment-worker.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../config/database";
import { orders } from "../infrastructure/database/drizzle/schema/orders";
import { payments } from "../infrastructure/database/drizzle/schema/payments";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// ponytail: mock RabbitMQ and setTimeout for deterministic testing
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

vi.mock("../infrastructure/database/repositories/drizzle-payment-repo", () => ({
  createDrizzlePaymentRepo: vi.fn(() => ({
    save: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findByOrderId: vi.fn().mockResolvedValue(null),
  })),
}));

import { createPaymentWorker } from "../infrastructure/rabbitmq/consumers/payment-worker";
import type { Channel, ConsumeMessage } from "amqplib";

describe("Payment Worker", () => {
  const orderId = randomUUID();
  const userId = randomUUID();

  beforeEach(async () => {
    await db.insert(orders).values({
      id: orderId,
      userId,
      status: "pending",
      totalAmount: "59.99",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("processes payment successfully and updates order status", async () => {
    // Force Math.random to return 0.5 (< 0.9 = success)
    const originalRandom = Math.random;
    Math.random = vi.fn().mockReturnValue(0.5);

    const { publishEvent } = await import("../config/rabbitmq");
    const mockRepo = (await import("../infrastructure/database/repositories/drizzle-payment-repo")).createDrizzlePaymentRepo();
    const worker = createPaymentWorker(mockRepo, publishEvent);
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    await worker(ch);

    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event = {
      orderId,
      userId,
      totalAmount: "59.99",
      items: [{ productId: randomUUID(), quantity: 2, subtotal: "59.98" }],
      timestamp: new Date().toISOString(),
    };

    const msg = { content: Buffer.from(JSON.stringify(event)) } as ConsumeMessage;
    await consumeHandler(msg);

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);

    expect(payment.status).toBe("success");
    expect(payment.amount).toBe("59.99");
    expect(payment.paidAt).not.toBeNull();

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    expect(order.status).toBe("paid");

    expect(publishEvent).toHaveBeenCalledWith(
      "payment.completed",
      expect.objectContaining({ orderId }),
    );

    Math.random = originalRandom;
  });

  it("handles payment failure and publishes release event", async () => {
    // Force Math.random to return 0.95 (>= 0.9 = failure)
    const originalRandom = Math.random;
    Math.random = vi.fn().mockReturnValue(0.95);

    const { publishEvent } = await import("../config/rabbitmq");
    const mockRepo = (await import("../infrastructure/database/repositories/drizzle-payment-repo")).createDrizzlePaymentRepo();
    const worker = createPaymentWorker(mockRepo, publishEvent);
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    await worker(ch);

    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event = {
      orderId,
      userId,
      totalAmount: "59.99",
      items: [{ productId: randomUUID(), quantity: 1, subtotal: "59.99" }],
      timestamp: new Date().toISOString(),
    };

    const msg = { content: Buffer.from(JSON.stringify(event)) } as ConsumeMessage;
    await consumeHandler(msg);

    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);

    expect(payment.status).toBe("failed");

    expect(publishEvent).toHaveBeenCalledWith(
      "payment.failed",
      expect.objectContaining({ reason: "payment_declined" }),
    );
    expect(publishEvent).toHaveBeenCalledWith(
      "inventory.release",
      expect.objectContaining({ orderId }),
    );

    Math.random = originalRandom;
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new payment worker tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/payment-worker.test.ts
git commit -m "feat(backend): add payment worker tests"
```

---

## Acceptance Criteria
- [ ] payments table exists with unique FK to orders
- [ ] Payment worker consumes from `payment.request` queue bound to `inventory.reserved`
- [ ] Worker simulates 2-second payment delay
- [ ] Worker updates payment status to "success" and order to "paid" on success
- [ ] Worker publishes `payment.completed` on success
- [ ] Worker updates payment to "failed" and publishes `payment.failed` + `inventory.release` on failure
- [ ] All tests pass

## Test Plan
- **Integration (DB-only, RabbitMQ + setTimeout mocked):** Successful payment flow (payment record, order status update, event publishing), failed payment flow (payment failure record, cancellation events)
