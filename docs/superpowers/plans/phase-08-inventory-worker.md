# Phase 8: Inventory Worker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consume `order.created` events, validate stock, reduce inventory, log changes, and handle insufficient stock by cancelling the order.

**Architecture:** Drizzle schema (inventory_logs) → Domain entity (InventoryLog) → Repository interface → Drizzle implementation → RabbitMQ consumer (inventory worker). The worker listens on the `inventory.updated` queue bound to `order.created`, validates each product's stock via Product.reduceStock(), deducts stock and logs the change, or marks the order as cancelled and publishes `inventory.failed` if stock is insufficient.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, RabbitMQ (amqplib), Vitest

---

### Task 1: Create inventory_logs Drizzle schema

**Files:**
- Create: `backend/src/infrastructure/database/drizzle/schema/inventory-logs.ts`
- Modify: `backend/src/infrastructure/database/drizzle/schema/index.ts`

- [ ] **Step 1: Create inventory_logs table schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/inventory-logs.ts
import { pgTable, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { products } from "./products";

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // "reserve" | "release" | "restock"
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
```

- [ ] **Step 3: Generate migration**

Run: `cd backend && npx drizzle-kit generate`
Expected: Migration file created in `src/infrastructure/database/drizzle/migrations/` with inventory_logs DDL.

Run: `cd backend && npx drizzle-kit migrate`
Expected: inventory_logs table created in PostgreSQL.

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/drizzle/schema/inventory-logs.ts backend/src/infrastructure/database/drizzle/schema/index.ts backend/src/infrastructure/database/drizzle/migrations/
git commit -m "feat(backend): add inventory_logs Drizzle schema and migration"
```

---

### Task 2: Create InventoryLog domain entity and repository interface

**Files:**
- Create: `backend/src/domain/inventory/entities/inventory-log.ts`
- Create: `backend/src/domain/inventory/repositories/inventory-repository.ts`

- [ ] **Step 1: Create InventoryLog entity**

```typescript
// backend/src/domain/inventory/entities/inventory-log.ts

/** A log entry tracking inventory changes for a product. */
export interface InventoryLog {
  id: string;
  productId: string;
  orderId: string;
  quantityChange: number;
  type: "reserve" | "release" | "restock";
  createdAt: Date;
}

/** Creates a new InventoryLog with the given properties. */
export function createInventoryLog(props: {
  productId: string;
  orderId: string;
  quantityChange: number;
  type: "reserve" | "release" | "restock";
}): InventoryLog {
  return {
    id: crypto.randomUUID(),
    productId: props.productId,
    orderId: props.orderId,
    quantityChange: props.quantityChange,
    type: props.type,
    createdAt: new Date(),
  };
}
```

- [ ] **Step 2: Create IInventoryRepository interface**

```typescript
// backend/src/domain/inventory/repositories/inventory-repository.ts
import type { InventoryLog } from "../entities/inventory-log";

/** Repository interface for persisting inventory log entries. */
export interface IInventoryRepository {
  /** Persists a single inventory log entry. */
  save(log: InventoryLog): Promise<void>;
}
```

- [ ] **Step 3: Create directories**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\inventory\entities" -Force
New-Item -ItemType Directory -Path "$root\domain\inventory\repositories" -Force
```

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/inventory/
git commit -m "feat(backend): add InventoryLog entity and repository interface"
```

---

### Task 3: Add reduceStock method to Product entity

**Files:**
- Create: `backend/src/domain/products/entities/product.ts`

- [ ] **Step 1: Create Product entity with reduceStock**

```typescript
// backend/src/domain/products/entities/product.ts

/** A product listing in the catalogue. */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  categoryId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Creates a new Product with the given properties. */
export function createProduct(props: {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  categoryId: string;
  isActive: boolean;
}): Product {
  const now = new Date();
  return { ...props, createdAt: now, updatedAt: now };
}

/** Returns true when the product has enough stock to cover the requested quantity. */
export function reduceStock(product: Product, quantity: number): boolean {
  return product.stock >= quantity;
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/products/entities/product.ts
git commit -m "feat(backend): add reduceStock function to Product entity"
```

---

### Task 4: Create DrizzleInventoryRepository

**Files:**
- Create: `backend/src/infrastructure/database/repositories/drizzle-inventory-repo.ts`

- [ ] **Step 1: Create DrizzleInventoryRepository**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-inventory-repo.ts
import { db } from "../../../config/database";
import { inventoryLogs } from "../drizzle/schema/inventory-logs";
import type { IInventoryRepository } from "../../../domain/inventory/repositories/inventory-repository";
import type { InventoryLog } from "../../../domain/inventory/entities/inventory-log";

/** Creates a Drizzle-backed inventory repository. */
export function createDrizzleInventoryRepo(): IInventoryRepository {
  return {
    async save(log: InventoryLog): Promise<void> {
      await db.insert(inventoryLogs).values({
        id: log.id,
        productId: log.productId,
        orderId: log.orderId,
        quantityChange: log.quantityChange,
        type: log.type,
        createdAt: log.createdAt,
      });
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/repositories/drizzle-inventory-repo.ts
git commit -m "feat(backend): add createDrizzleInventoryRepo"
```

---

### Task 5: Create inventory worker

**Files:**
- Create: `backend/src/infrastructure/rabbitmq/consumers/inventory-worker.ts`

- [ ] **Step 1: Create inventory worker**

```typescript
// backend/src/infrastructure/rabbitmq/consumers/inventory-worker.ts
import type { Channel } from "amqplib";
import { eq, sql } from "drizzle-orm";
import { db } from "../../../config/database";
import { products } from "../../database/drizzle/schema/products";
import { orders } from "../../database/drizzle/schema/orders";
import type { IInventoryRepository } from "../../../domain/inventory/repositories/inventory-repository";
import { createInventoryLog } from "../../../domain/inventory/entities/inventory-log";

const QUEUE = "inventory.updated";
const ROUTING_KEY = "order.created";

interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  totalAmount: string;
  items: { productId: string; quantity: number; subtotal: string }[];
  timestamp: string;
}

/** Creates the inventory worker that consumes order.created events. */
export function createInventoryWorker(
  inventoryRepo: IInventoryRepository,
  publish: (event: string, payload: Record<string, unknown>) => Promise<void>,
) {
  /** Starts consuming from the inventory.updated queue. */
  return async (channel: Channel): Promise<void> => {
    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, "shop.exchange", ROUTING_KEY);

    await channel.consume(QUEUE, async (msg) => {
      if (!msg) return;

      try {
        const event: OrderCreatedEvent = JSON.parse(msg.content.toString());
        let allValid = true;

        for (const item of event.items) {
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          if (!product || Number(product.stock) < item.quantity) {
            allValid = false;
            break;
          }
        }

        if (allValid) {
          for (const item of event.items) {
            await db
              .update(products)
              .set({ stock: sql`stock - ${item.quantity}` })
              .where(eq(products.id, item.productId));

            const log = createInventoryLog({
              productId: item.productId,
              orderId: event.orderId,
              quantityChange: -item.quantity,
              type: "reserve",
            });
            await inventoryRepo.save(log);
          }

          await publish("inventory.reserved", {
            orderId: event.orderId,
            userId: event.userId,
            totalAmount: event.totalAmount,
            items: event.items,
            timestamp: new Date().toISOString(),
          }).catch((err) => console.error("Failed to publish inventory.reserved event:", err));
        } else {
          await db
            .update(orders)
            .set({ status: "cancelled", updatedAt: new Date() })
            .where(eq(orders.id, event.orderId));

          await publish("inventory.failed", {
            orderId: event.orderId,
            userId: event.userId,
            reason: "insufficient_stock",
            timestamp: new Date().toISOString(),
          }).catch((err) => console.error("Failed to publish inventory.failed event:", err));
        }

        channel.ack(msg);
      } catch (err) {
        console.error("Inventory worker error:", err);
        channel.nack(msg, false, true);
      }
    });

    console.log(`Inventory worker listening on queue: ${QUEUE}`);
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/rabbitmq/consumers/inventory-worker.ts
git commit -m "feat(backend): add inventory worker consuming order.created events"
```

---

### Task 6: Create worker entry point

**Files:**
- Create: `backend/src/infrastructure/workers/index.ts`

- [ ] **Step 1: Create workers entry point**

```typescript
// backend/src/infrastructure/workers/index.ts
import { getRabbitChannel } from "../../config/rabbitmq";
import { createDrizzleInventoryRepo } from "../database/repositories/drizzle-inventory-repo";
import { publishEvent } from "../../config/rabbitmq";
import { createInventoryWorker } from "../rabbitmq/consumers/inventory-worker";

/** Starts the inventory worker. */
export async function startInventoryWorker(): Promise<void> {
  const channel = await getRabbitChannel();
  const inventoryRepo = createDrizzleInventoryRepo();
  const worker = createInventoryWorker(inventoryRepo, publishEvent);
  await worker(channel);
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/workers/index.ts
git commit -m "feat(backend): add worker entry point"
```

---

### Task 7: Write inventory worker tests

**Files:**
- Create: `backend/src/tests/inventory-worker.test.ts`

- [ ] **Step 1: Create inventory worker test file**

```typescript
// backend/src/tests/inventory-worker.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../config/database";
import { products } from "../infrastructure/database/drizzle/schema/products";
import { orders } from "../infrastructure/database/drizzle/schema/orders";
import { inventoryLogs } from "../infrastructure/database/drizzle/schema/inventory-logs";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// ponytail: mock RabbitMQ since worker requires a running RabbitMQ instance
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

vi.mock("../infrastructure/database/repositories/drizzle-inventory-repo", () => ({
  createDrizzleInventoryRepo: vi.fn(() => ({
    save: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { createInventoryWorker } from "../infrastructure/rabbitmq/consumers/inventory-worker";
import type { Channel, ConsumeMessage } from "amqplib";

describe("Inventory Worker", () => {
  const orderId = randomUUID();
  const userId = randomUUID();
  const productId = randomUUID();
  const categoryId = randomUUID();

  beforeEach(async () => {
    await db.insert(products).values({
      id: productId,
      name: "Test Product",
      slug: `test-product-${randomUUID()}`,
      description: "Test",
      price: "29.99",
      stock: 10,
      categoryId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await db.insert(orders).values({
      id: orderId,
      userId,
      status: "pending",
      totalAmount: "29.99",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("reduces stock when inventory is sufficient", async () => {
    const { publishEvent } = await import("../config/rabbitmq");
    const mockRepo = (await import("../infrastructure/database/repositories/drizzle-inventory-repo")).createDrizzleInventoryRepo();
    const worker = createInventoryWorker(mockRepo, publishEvent);
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    await worker(ch);

    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event = {
      orderId,
      userId,
      totalAmount: "29.99",
      items: [{ productId, quantity: 2, subtotal: "59.98" }],
      timestamp: new Date().toISOString(),
    };

    const msg = {
      content: Buffer.from(JSON.stringify(event)),
    } as ConsumeMessage;

    await consumeHandler(msg);

    const [updated] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    expect(Number(updated.stock)).toBe(8);

    const logs = await db
      .select()
      .from(inventoryLogs)
      .where(eq(inventoryLogs.orderId, orderId));

    expect(logs).toHaveLength(1);
    expect(logs[0].quantityChange).toBe(-2);
    expect(logs[0].type).toBe("reserve");
  });

  it("cancels order when stock is insufficient", async () => {
    const { publishEvent } = await import("../config/rabbitmq");
    const mockRepo = (await import("../infrastructure/database/repositories/drizzle-inventory-repo")).createDrizzleInventoryRepo();
    const worker = createInventoryWorker(mockRepo, publishEvent);
    const ch = await import("../config/rabbitmq").then((m) => m.getRabbitChannel()) as Channel;
    await worker(ch);

    const consumeHandler = (ch.consume as ReturnType<typeof vi.fn>).mock.calls[0][1];

    const event = {
      orderId,
      userId,
      totalAmount: "29.99",
      items: [{ productId, quantity: 20, subtotal: "599.80" }],
      timestamp: new Date().toISOString(),
    };

    const msg = {
      content: Buffer.from(JSON.stringify(event)),
    } as ConsumeMessage;

    await consumeHandler(msg);

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    expect(order.status).toBe("cancelled");

    expect(publishEvent).toHaveBeenCalledWith(
      "inventory.failed",
      expect.objectContaining({ reason: "insufficient_stock" }),
    );
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new inventory worker tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/inventory-worker.test.ts
git commit -m "feat(backend): add inventory worker tests"
```

---

## Acceptance Criteria
- [ ] inventory_logs table exists in PostgreSQL with FK to products
- [ ] Inventory worker consumes from `inventory.updated` queue bound to `order.created`
- [ ] Worker reduces stock when inventory is sufficient
- [ ] Worker logs inventory changes with type "reserve"
- [ ] Worker cancels order and publishes `inventory.failed` when stock is insufficient
- [ ] Worker publishes `inventory.reserved` event on success
- [ ] Product entity has reduceStock function
- [ ] All tests pass

## Test Plan
- **Integration (DB-only, RabbitMQ mocked):** Stock reduction on sufficient inventory, order cancellation on insufficient stock, inventory_log insertion, event publishing on success and failure
