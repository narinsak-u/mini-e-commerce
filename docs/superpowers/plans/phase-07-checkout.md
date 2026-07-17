# Phase 7: Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the checkout flow — customer creates an order from their cart contents with status "pending", and the system publishes an `order.created` event to RabbitMQ for downstream workers (inventory, payment, etc.).

**Architecture:** Drizzle schemas (orders, order_items) → Domain entities (Order, OrderItem) → Repository interface → Drizzle implementation → Use cases (CreateOrder, GetOrder, ListUserOrders, UpdateOrderStatus) → Controllers → Routes. CreateOrder reads Redis cart, creates order+items in PostgreSQL, clears cart, publishes `order.created` to RabbitMQ `shop.exchange`. Admin-only status update endpoint.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, Redis, RabbitMQ, Zod

---

### Task 1: Create orders and order_items Drizzle schemas

**Files:**
- Create: `backend/src/infrastructure/database/drizzle/schema/orders.ts`
- Create: `backend/src/infrastructure/database/drizzle/schema/order-items.ts`
- Modify: `backend/src/infrastructure/database/drizzle/schema/index.ts`

- [ ] **Step 1: Create orders table schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/orders.ts
import { pgTable, uuid, varchar, numeric, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import type { OrderStatus } from "../../../../shared/types";

export const orderStatusEnum = (status: OrderStatus) => status;

/** Orders table: stores checkout orders with status lifecycle. */
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Create order_items table schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/order-items.ts
import { pgTable, uuid, varchar, numeric, integer } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { products } from "./products";

/** Order items table: snapshot of product name/price at time of order. */
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productPrice: numeric("product_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
});
```

- [ ] **Step 3: Update schema index**

```typescript
// backend/src/infrastructure/database/drizzle/schema/index.ts
export { users, roleEnum } from "./users";
export { categories } from "./categories";
export { products } from "./products";
export { orders } from "./orders";
export { orderItems } from "./order-items";
```

- [ ] **Step 4: Generate migration**

Run: `cd backend && npx drizzle-kit generate`
Expected: Migration file created in `src/infrastructure/database/drizzle/migrations/` with orders and order_items DDL.

Run: `cd backend && npx drizzle-kit migrate`
Expected: Orders and order_items tables created in PostgreSQL.

Run: `docker compose exec postgres psql -U shopflow -d shopflow -c "\dt"`
Expected: Shows `users`, `categories`, `products`, `orders`, and `order_items` tables.

- [ ] **Step 5: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/drizzle/schema/orders.ts backend/src/infrastructure/database/drizzle/schema/order-items.ts backend/src/infrastructure/database/drizzle/schema/index.ts backend/src/infrastructure/database/drizzle/migrations/
git commit -m "feat(backend): add orders and order_items Drizzle schemas and migration"
```

---

### Task 2: Create Order domain entities and repository interface

**Files:**
- Create: `backend/src/domain/orders/entities/order.ts`
- Create: `backend/src/domain/orders/repositories/order-repository.ts`

- [ ] **Step 1: Create Order and OrderItem entities**

```typescript
// backend/src/domain/orders/entities/order.ts
import type { OrderStatus } from "../../../shared/types";

/** A single line item within an order (snapshot of product at purchase time). */
export interface OrderItem {
  readonly id: string;
  readonly orderId: string;
  readonly productId: string;
  readonly productName: string;
  readonly productPrice: string;
  readonly quantity: number;
  readonly subtotal: string;
}

/** Creates an OrderItem from the given props. */
export function createOrderItem(props: OrderItem): OrderItem {
  return { ...props };
}

/** A purchase order with status lifecycle and line items. */
export interface Order {
  readonly id: string;
  readonly userId: string;
  readonly status: OrderStatus;
  readonly totalAmount: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  items: OrderItem[];
}

/** Creates a new pending Order. */
export function createOrder(props: {
  id: string;
  userId: string;
  totalAmount: string;
}): Order {
  return {
    id: props.id,
    userId: props.userId,
    status: "pending",
    totalAmount: props.totalAmount,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
  };
}

/** Returns a new Order with the given status and updated timestamp. */
export function updateOrderStatus(order: Order, status: OrderStatus): Order {
  return { ...order, status, updatedAt: new Date() };
}
```

- [ ] **Step 2: Create IOrderRepository interface**

```typescript
// backend/src/domain/orders/repositories/order-repository.ts
import type { Order } from "../entities/order";
import type { OrderItem } from "../entities/order";
import type { OrderStatus } from "../../../shared/types";

/** Repository interface for order persistence. */
export interface IOrderRepository {
  /** Finds an order by ID, including its items. */
  findById(id: string): Promise<Order | null>;
  /** Lists a user's orders with pagination. */
  findByUserId(userId: string, page?: number, limit?: number): Promise<{ data: Order[]; total: number }>;
  /** Persists a new order. */
  save(order: Order): Promise<void>;
  /** Persists an order item. */
  saveItem(item: OrderItem): Promise<void>;
  /** Updates the status of an existing order. */
  updateStatus(id: string, status: OrderStatus): Promise<void>;
}
```

- [ ] **Step 3: Create directories and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\orders\entities" -Force
New-Item -ItemType Directory -Path "$root\domain\orders\repositories" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/orders/
git commit -m "feat(backend): add Order/OrderItem entities and repository interface"
```

---

### Task 3: Add publishEvent helper to RabbitMQ config

**Files:**
- Modify: `backend/src/config/rabbitmq.ts`

- [ ] **Step 1: Add publishEvent function**

```typescript
// backend/src/config/rabbitmq.ts
import amqp from "amqplib";
import { env } from "./env";

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

/** Returns a cached RabbitMQ channel, creating the connection if needed. */
export async function getRabbitChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();
  await channel.assertExchange("shop.exchange", "topic", { durable: true });
  return channel;
}

/** Publishes a JSON event to shop.exchange with the given routing key. */
export async function publishEvent(routingKey: string, payload: unknown): Promise<void> {
  const ch = await getRabbitChannel();
  ch.publish("shop.exchange", routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

/** Closes the RabbitMQ connection and channel. */
export async function closeRabbit(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/config/rabbitmq.ts
git commit -m "feat(backend): add publishEvent helper to RabbitMQ config"
```

---

### Task 4: Create order use cases

**Files:**
- Create: `backend/src/application/orders/use-cases/create-order.ts`
- Create: `backend/src/application/orders/use-cases/get-order.ts`
- Create: `backend/src/application/orders/use-cases/list-user-orders.ts`
- Create: `backend/src/application/orders/use-cases/update-order-status.ts`

- [ ] **Step 1: Create CreateOrder use case**

```typescript
// backend/src/application/orders/use-cases/create-order.ts
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createOrder, createOrderItem, type OrderItem } from "../../../domain/orders/entities/order";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";
import { publishEvent } from "../../../config/rabbitmq";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  userId: z.string().uuid(),
});

/** Creates a CreateOrder use case. */
export function createOrderUseCase(
  orderRepo: IOrderRepository,
  cartRepo: ICartRepository,
) {
  /**
   * Creates an order from the user's cart, clears the cart, and publishes order.created.
   * @throws NotFoundError if cart is empty.
   */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const cart = await cartRepo.findByUserId(data.userId);
    if (cart.items.length === 0) throw new NotFoundError("Cart items");

    const orderId = randomUUID();
    const order = createOrder({ id: orderId, userId: data.userId, totalAmount: cart.totalAmount });
    await orderRepo.save(order);

    const items: OrderItem[] = cart.items.map((item) =>
      createOrderItem({
        id: randomUUID(),
        orderId,
        productId: item.productId,
        productName: item.name,
        productPrice: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }),
    );

    for (const item of items) {
      await orderRepo.saveItem(item);
    }

    await cartRepo.clear(data.userId);

    // ponytail: fire-and-forget event, add retry with dead-letter when worker reliability matters
    await publishEvent("order.created", {
      orderId,
      userId: data.userId,
      totalAmount: cart.totalAmount,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, subtotal: i.subtotal })),
      timestamp: new Date().toISOString(),
    }).catch((err) => console.error("Failed to publish order.created event:", err));

    return { ...order, items };
  };
}
```

- [ ] **Step 2: Create GetOrder use case**

```typescript
// backend/src/application/orders/use-cases/get-order.ts
import { z } from "zod";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

/** Creates a GetOrder use case. */
export function createGetOrder(orderRepo: IOrderRepository) {
  /**
   * Returns an order if it belongs to the requesting user.
   * @throws NotFoundError if order not found or belongs to another user.
   */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const order = await orderRepo.findById(data.id);
    if (!order) throw new NotFoundError("Order");
    if (order.userId !== data.userId) throw new NotFoundError("Order");

    return order;
  };
}
```

- [ ] **Step 3: Create ListUserOrders use case**

```typescript
// backend/src/application/orders/use-cases/list-user-orders.ts
import { z } from "zod";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";

const schema = z.object({
  userId: z.string().uuid(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

/** Creates a ListUserOrders use case. */
export function createListUserOrders(orderRepo: IOrderRepository) {
  /** Returns a paginated list of the user's orders. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    return orderRepo.findByUserId(data.userId, data.page, data.limit);
  };
}
```

- [ ] **Step 4: Create UpdateOrderStatus use case**

```typescript
// backend/src/application/orders/use-cases/update-order-status.ts
import { z } from "zod";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { OrderStatus } from "../../../shared/types";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "paid", "packing", "shipping", "completed", "cancelled"]),
});

/** Creates an UpdateOrderStatus use case. */
export function createUpdateOrderStatus(orderRepo: IOrderRepository) {
  /**
   * Updates the order status and returns the updated order.
   * @throws NotFoundError if order not found.
   */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const order = await orderRepo.findById(data.id);
    if (!order) throw new NotFoundError("Order");

    await orderRepo.updateStatus(data.id, data.status as OrderStatus);

    const updated = await orderRepo.findById(data.id);
    return updated!;
  };
}
```

- [ ] **Step 5: Create directory and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\application\orders\use-cases" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/orders/use-cases/
git commit -m "feat(backend): add order use cases (create, get, list, update status)"
```

---

### Task 5: Create DrizzleOrderRepository implementation

**Files:**
- Create: `backend/src/infrastructure/database/repositories/drizzle-order-repo.ts`

- [ ] **Step 1: Create DrizzleOrderRepository**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-order-repo.ts
import { eq, desc, count } from "drizzle-orm";
import { db } from "../../../config/database";
import { orders } from "../drizzle/schema/orders";
import { orderItems } from "../drizzle/schema/order-items";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import { createOrder, createOrderItem, type Order, type OrderItem } from "../../../domain/orders/entities/order";
import type { OrderStatus } from "../../../shared/types";

/** Creates a Drizzle-backed order repository. */
export function createDrizzleOrderRepo(): IOrderRepository {
  return {
    async findById(id: string): Promise<Order | null> {
      const orderRow = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!orderRow[0]) return null;

      const itemRows = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      return toDomain(orderRow[0], itemRows);
    },

    async findByUserId(userId: string, page = 1, limit = 10): Promise<{ data: Order[]; total: number }> {
      const offset = (page - 1) * limit;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(orders)
          .where(eq(orders.userId, userId))
          .orderBy(desc(orders.createdAt))
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(orders).where(eq(orders.userId, userId)),
      ]);

      const data = await Promise.all(
        rows.map(async (row) => {
          const itemRows = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, row.id));
          return toDomain(row, itemRows);
        }),
      );

      return { data, total: Number(totalResult[0].value) };
    },

    async save(order: Order): Promise<void> {
      await db.insert(orders).values({
        id: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      });
    },

    async saveItem(item: OrderItem): Promise<void> {
      await db.insert(orderItems).values({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });
    },

    async updateStatus(id: string, status: OrderStatus): Promise<void> {
      await db
        .update(orders)
        .set({ status, updatedAt: new Date() })
        .where(eq(orders.id, id));
    },
  };
}

/** Converts database rows to a domain Order object. */
function toDomain(
  row: typeof orders.$inferSelect,
  itemRows: (typeof orderItems.$inferSelect)[],
): Order {
  const items = itemRows.map((r) =>
    createOrderItem({
      id: r.id,
      orderId: r.orderId,
      productId: r.productId,
      productName: r.productName,
      productPrice: r.productPrice,
      quantity: r.quantity,
      subtotal: r.subtotal,
    }),
  );
  return {
    id: row.id,
    userId: row.userId,
    status: row.status as OrderStatus,
    totalAmount: row.totalAmount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/repositories/drizzle-order-repo.ts
git commit -m "feat(backend): add DrizzleOrderRepository implementation"
```

---

### Task 6: Create checkout and order controllers

**Files:**
- Create: `backend/src/presentation/controllers/checkout-controller.ts`
- Create: `backend/src/presentation/controllers/order-controller.ts`

- [ ] **Step 1: Create CheckoutController**

```typescript
// backend/src/presentation/controllers/checkout-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../../shared/errors/app-error";

/** Creates the checkout controller. */
export function createCheckoutController(
  createOrder: (input: { userId: string }) => Promise<any>,
) {
  return {
    /** Handles POST /checkout. Creates an order from the user's cart. @throws ValidationError on invalid input. */
    async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await createOrder({ userId: req.user!.sub });
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },
  };
}
```

- [ ] **Step 2: Create OrderController**

```typescript
// backend/src/presentation/controllers/order-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../../shared/errors/app-error";

/** Creates the order controller. */
export function createOrderController(
  getOrder: (input: { id: string; userId: string }) => Promise<any>,
  listUserOrders: (input: { userId: string; page: string; limit: string }) => Promise<any>,
  updateOrderStatus: (input: { id: string; status: string }) => Promise<any>,
) {
  return {
    /** Handles GET /orders/:id. @throws ValidationError on invalid input. */
    async get(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await getOrder({
          id: req.params.id,
          userId: req.user!.sub,
        });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles GET /orders. Returns paginated user orders. @throws ValidationError on invalid input. */
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await listUserOrders({
          userId: req.user!.sub,
          page: req.query.page as string,
          limit: req.query.limit as string,
        });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },

    /** Handles PATCH /orders/:id. Admin-only: updates order status. @throws ValidationError on invalid input. */
    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const result = await updateOrderStatus({
          id: req.params.id,
          status: req.body.status,
        });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        next(err);
      }
    },
  };
}
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/checkout-controller.ts backend/src/presentation/controllers/order-controller.ts
git commit -m "feat(backend): add checkout and order controllers"
```

---

### Task 7: Create checkout and order routes

**Files:**
- Create: `backend/src/presentation/routes/checkout.ts`
- Create: `backend/src/presentation/routes/orders.ts`

- [ ] **Step 1: Create checkout routes**

```typescript
// backend/src/presentation/routes/checkout.ts
import { Router } from "express";
import { createRedisCartRepo } from "../../infrastructure/redis/cart-repository";
import { createDrizzleOrderRepo } from "../../infrastructure/database/repositories/drizzle-order-repo";
import { createOrderUseCase } from "../../application/orders/use-cases/create-order";
import { createCheckoutController } from "../controllers/checkout-controller";
import { authMiddleware } from "../middleware/auth";

const orderRepo = createDrizzleOrderRepo();
const cartRepo = createRedisCartRepo();
const createOrder = createOrderUseCase(orderRepo, cartRepo);
const controller = createCheckoutController(createOrder);

const router = Router();

router.post("/", authMiddleware, controller.checkout);

export default router;
```

- [ ] **Step 2: Create order routes**

```typescript
// backend/src/presentation/routes/orders.ts
import { Router } from "express";
import { createDrizzleOrderRepo } from "../../infrastructure/database/repositories/drizzle-order-repo";
import { createGetOrder } from "../../application/orders/use-cases/get-order";
import { createListUserOrders } from "../../application/orders/use-cases/list-user-orders";
import { createUpdateOrderStatus } from "../../application/orders/use-cases/update-order-status";
import { createOrderController } from "../controllers/order-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

const orderRepo = createDrizzleOrderRepo();
const getOrder = createGetOrder(orderRepo);
const listUserOrders = createListUserOrders(orderRepo);
const updateOrderStatus = createUpdateOrderStatus(orderRepo);
const controller = createOrderController(getOrder, listUserOrders, updateOrderStatus);

const router = Router();

router.use(authMiddleware);

router.get("/", controller.list);
router.get("/:id", controller.get);
router.patch("/:id", rbacMiddleware("admin"), controller.updateStatus);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/routes/checkout.ts backend/src/presentation/routes/orders.ts
git commit -m "feat(backend): add checkout and order routes"
```

---

### Task 8: Wire checkout and order routes into the Express app

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update index.ts**

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

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 2: Start server and verify endpoints**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3000.

Run: `curl -X POST http://localhost:3000/checkout -H "Authorization: Bearer <token>"`
Expected: `{ "id": "...", "userId": "...", "status": "pending", "totalAmount": "...", "items": [...] }`

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/index.ts
git commit -m "feat(backend): wire checkout and order routes into Express app"
```

---

### Task 9: Write checkout integration tests

**Files:**
- Create: `backend/src/tests/checkout.test.ts`

- [ ] **Step 1: Create checkout test file**

```typescript
// backend/src/tests/checkout.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { redis } from "../config/redis";
import { eq } from "drizzle-orm";
import { users, categories, products, orders, orderItems } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";
import amqp from "amqplib";
import { env } from "../config/env";

const adminEmail = `admin-${randomUUID()}@example.com`;
const adminPassword = "password123";
let adminToken = "";
let customerToken = "";
let productId = "";

beforeAll(async () => {
  await redis.flushdb();

  // Create admin
  const adminRes = await request(app)
    .post("/auth/register")
    .send({ name: "Admin", email: adminEmail, password: adminPassword });
  adminToken = adminRes.body.accessToken;
  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, adminEmail));

  // Create customer
  const custEmail = `cust-${randomUUID()}@example.com`;
  const custRes = await request(app)
    .post("/auth/register")
    .send({ name: "Customer", email: custEmail, password: "password123" });
  customerToken = custRes.body.accessToken;

  // Create category and product
  const catRes = await request(app)
    .post("/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Checkout Category" });
  const categoryId = catRes.body.id;

  const prodRes = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Checkout Product", price: "29.99", stock: 50, categoryId });
  productId = prodRes.body.id;

  // Add product to customer cart
  await request(app)
    .post("/cart/items")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ productId, quantity: 2 });
});

afterAll(async () => {
  await redis.flushdb();
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(users).where(eq(users.email, adminEmail));
});

describe("Checkout API", () => {
  it("rejects checkout without authentication", async () => {
    const res = await request(app).post("/checkout");
    expect(res.status).toBe(401);
  });

  it("creates an order from cart", async () => {
    const res = await request(app)
      .post("/checkout")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("pending");
    expect(res.body.totalAmount).toBe("59.98");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productName).toBe("Checkout Product");
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.items[0].subtotal).toBe("59.98");
  });

  it("clears cart after checkout", async () => {
    const cartRes = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(cartRes.body.items).toEqual([]);
  });

  it("rejects checkout with empty cart", async () => {
    const res = await request(app)
      .post("/checkout")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
  });

  it("publishes order.created event to RabbitMQ", async () => {
    // Add product back to cart
    await request(app)
      .post("/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productId, quantity: 1 });

    const res = await request(app)
      .post("/checkout")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(201);

    // Verify event was published by consuming it
    const connection = await amqp.connect(env.rabbitmqUrl);
    const ch = await connection.createChannel();
    await ch.assertExchange("shop.exchange", "topic", { durable: true });
    const q = await ch.assertQueue("", { exclusive: true });
    await ch.bindQueue(q.queue, "shop.exchange", "order.created");

    const msg = await ch.get(q.queue, { noAck: true });
    expect(msg).toBeTruthy();
    const payload = JSON.parse(msg!.content.toString());
    expect(payload.orderId).toBe(res.body.id);
    expect(payload.totalAmount).toBe("29.99");
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].productId).toBe(productId);

    await ch.close();
    await connection.close();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new checkout tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/checkout.test.ts
git commit -m "feat(backend): add checkout integration tests"
```

---

### Task 10: Write orders integration tests

**Files:**
- Create: `backend/src/tests/orders.test.ts`

- [ ] **Step 1: Create orders test file**

```typescript
// backend/src/tests/orders.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { redis } from "../config/redis";
import { eq } from "drizzle-orm";
import { users, categories, products, orders, orderItems } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";

const adminEmail = `admin-${randomUUID()}@example.com`;
const adminPassword = "password123";
const custEmail = `cust-${randomUUID()}@example.com`;
let adminToken = "";
let customerToken = "";
let productId = "";
let orderId = "";

beforeAll(async () => {
  await redis.flushdb();

  // Create admin
  const adminRes = await request(app)
    .post("/auth/register")
    .send({ name: "Admin", email: adminEmail, password: adminPassword });
  adminToken = adminRes.body.accessToken;
  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, adminEmail));

  // Create customer
  const custRes = await request(app)
    .post("/auth/register")
    .send({ name: "Customer", email: custEmail, password: "password123" });
  customerToken = custRes.body.accessToken;

  // Create category and product
  const catRes = await request(app)
    .post("/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Order Category" });
  const categoryId = catRes.body.id;

  const prodRes = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Order Product", price: "49.99", stock: 30, categoryId });
  productId = prodRes.body.id;

  // Add to cart and checkout to create an order
  await request(app)
    .post("/cart/items")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ productId, quantity: 1 });

  const checkoutRes = await request(app)
    .post("/checkout")
    .set("Authorization", `Bearer ${customerToken}`);
  orderId = checkoutRes.body.id;
});

afterAll(async () => {
  await redis.flushdb();
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(users);
});

describe("Orders API", () => {
  it("lists user orders", async () => {
    const res = await request(app)
      .get("/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].totalAmount).toBe("49.99");
  });

  it("rejects listing orders without auth", async () => {
    const res = await request(app).get("/orders");
    expect(res.status).toBe(401);
  });

  it("gets a single order with items", async () => {
    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pending");
    expect(res.body.totalAmount).toBe("49.99");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productName).toBe("Order Product");
    expect(res.body.items[0].quantity).toBe(1);
  });

  it("returns 404 for another user's order", async () => {
    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("rejects non-admin status update", async () => {
    const res = await request(app)
      .patch(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ status: "paid" });
    expect(res.status).toBe(403);
  });

  it("admin updates order status", async () => {
    const res = await request(app)
      .patch(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paid");
  });

  it("admin updates order through full lifecycle", async () => {
    const statuses = ["packing", "shipping", "completed"];
    for (const status of statuses) {
      const res = await request(app)
        .patch(`/orders/${orderId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(status);
    }
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass, including the new orders tests.

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/orders.test.ts
git commit -m "feat(backend): add orders integration tests"
```

---

## Acceptance Criteria
- [ ] POST /checkout requires authentication
- [ ] POST /checkout creates order with status "pending" from cart items
- [ ] POST /checkout clears the cart after successful order
- [ ] POST /checkout returns 404 if cart is empty
- [ ] POST /checkout publishes `order.created` event to RabbitMQ `shop.exchange`
- [ ] GET /orders lists authenticated user's orders (paginated)
- [ ] GET /orders/:id returns single order with items
- [ ] GET /orders/:id returns 404 for another user's order
- [ ] PATCH /orders/:id requires admin role
- [ ] PATCH /orders/:id updates order status (admin only)
- [ ] Orders and order_items tables exist with proper FKs
- [ ] All integration tests pass

## Test Plan
- **Integration (supertest + Redis + RabbitMQ):** Checkout flow (create order, verify items, verify cart cleared, reject empty cart), RabbitMQ event consumption, order listing, single order with items, cross-user isolation, non-admin RBAC rejection, admin status update through full lifecycle
