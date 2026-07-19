# Backend Architecture & Workflows

## Overview

Express.js + TypeScript modular monolith using Clean Architecture. PostgreSQL (Drizzle ORM) for persistence, Redis for cache/cart/analytics, RabbitMQ for event-driven background workers.

## Directory Structure

```
src/
├── domain/              # Entities, repository interfaces, business rules
│   ├── auth/            # User entity, repo interface
│   ├── products/        # Product entity + repo interface
│   ├── categories/      # Category entity + repo interface
│   ├── cart/            # Cart entity + repo interface
│   ├── orders/          # Order entity + repo interface
│   ├── payments/        # Payment entity + repo interface
│   ├── inventory/       # Inventory log entity + repo interface
│   ├── notifications/   # Notification entity + repo interface
│   └── analytics/       # Analytics store interface
├── application/         # Use cases (one per file), input validation (Zod)
│   ├── auth/            # register, login, refresh-token, logout
│   ├── products/        # CRUD + list with filters
│   ├── categories/      # CRUD
│   ├── cart/            # add-item, remove-item, update-item, get-cart, clear-cart
│   ├── orders/          # create-order, list-orders, get-order, cancel-order, update-status
│   ├── payments/        # process-payment
│   ├── inventory/       # reserve-stock, release-stock
│   ├── notifications/   # list-notifications, mark-read
│   ├── analytics/       # track-payment
│   └── admin/           # get-dashboard, list-users, update-user-role
├── infrastructure/      # Implementations of domain interfaces
│   ├── database/
│   │   ├── drizzle/schema/   # Table definitions (users, products, categories, orders, etc.)
│   │   └── repositories/     # Drizzle implementations of repo interfaces
│   ├── redis/           # cache-service, cart-repository, analytics-store, rate-limiter, session-store
│   ├── auth/            # jwt-service, password-hasher
│   ├── rabbitmq/consumers/   # inventory, payment, notification, analytics consumers
│   └── workers/         # Worker orchestrator (starts all consumers)
├── presentation/        # HTTP layer
│   ├── routes/          # Express Router per module, wires DI
│   ├── controllers/     # Request/response handling, uses use cases
│   └── middleware/      # auth (JWT), rbac, error-handler, async-handler, request-logger
├── config/              # env.ts, database.ts, redis.ts, rabbitmq.ts (singletons)
├── shared/              # errors/app-error.ts (error hierarchy), types/index.ts (Role, OrderStatus)
└── tests/               # Vitest integration tests
```

## Clean Architecture Flow

```
HTTP Request
  → Presentation (route → middleware → controller)
    → Application (use case, validates input with Zod)
      → Domain (entities, business rules)
        → Infrastructure (Drizzle repo, Redis, RabbitMQ)
```

**Key rule:** Domain never imports from Infrastructure. Use cases accept repository interfaces (DI), not concrete implementations. Routes wire everything together at the edge.

### Example: Create Product

```
POST /products (admin)
  → authMiddleware → rbacMiddleware("admin")
  → product-controller.create
  → createProductUseCase(repo)          # repo injected via route file
    → schema.parse(input)               # Zod validation
    → repo.findBySlug(slug)             # duplicate check
    → createProduct(data)               # domain entity factory
    → repo.save(product)                # Drizzle insert
  ← 201 + product JSON
```

## Dependency Injection

No DI container. Routes act as the composition root:

```ts
// presentation/routes/products.ts
const repo = createDrizzleProductRepo();           // infrastructure
const controller = createProductController(        // presentation
  createProductUseCase(repo),                      // application
  listProductsUseCase(repo),
  // ...
);
router.post("/", authMiddleware, rbacMiddleware("admin"), controller.create);
```

Every use case is a function that takes interfaces and returns a function. This keeps use cases composable and testable (pass mocks in tests).

## Event-Driven Workflow (RabbitMQ)

### Exchange & Queues

```
Exchange: shop.exchange (topic, durable)
DLX: shop.dlx (fanout) → DLQ: shop.dead-letter
```

| Queue | Bound To (routing key) | Consumer |
|-------|----------------------|----------|
| `inventory.updated` | `order.created` | Inventory |
| `payment.request` | `inventory.reserved` | Payment |
| `notification.send` | `payment.completed`, `inventory.failed`, `order.shipped`, `order.completed` | Notification |
| `analytics` | `payment.completed` | Analytics |

All queues use dead-lettering: failed messages (nack without requeue) go to `shop.dead-letter`.

### Checkout Flow (end-to-end)

```
1. POST /checkout
   → createOrderUseCase: creates order in PostgreSQL, clears Redis cart
   → publishes "order.created" event

2. Inventory Consumer (inventory.updated queue)
   → reserveStockUseCase: validates stock ≥ quantity, deducts from product, logs inventory
   → publishes "inventory.reserved" on success
   → nack → DLQ on insufficient stock

3. Payment Consumer (payment.request queue)
   → processPaymentUseCase: creates payment record, simulates gateway (90% success)
   → on success: publishes "payment.completed"
   → on failure: publishes "payment.failed", calls releaseStockUseCase to restore inventory

4. Notification Consumer (notification.send queue)
   → saves in-app notification to PostgreSQL
   → logs mock email to stdout

5. Analytics Consumer (analytics queue)
   → trackPaymentUseCase: increments revenue, order count, daily stats, best sellers in Redis
```

### Worker Startup

`startWorkers()` in `src/infrastructure/workers/index.ts` is called once from `src/index.ts` after `app.listen()`. It creates all repo instances, passes them to consumer factories, and starts all four consumers in parallel.

## Redis Responsibilities

| Feature | Key Pattern | Implementation |
|---------|-------------|----------------|
| Product cache | `products:list:*`, `products:{id}` | `cache-service.ts` — 5min TTL, invalidated on write |
| Shopping cart | `cart:{userId}` (hash) | `cart-repository.ts` — hash field = productId, value = quantity |
| Analytics | `analytics:revenue`, `analytics:best_sellers` (sorted set), `analytics:daily:{date}` | `analytics-store.ts` |
| Rate limiting | `rate:{userId}` | `rate-limiter.ts` |
| Session | `session:{userId}` | `session-store.ts` |

## Authentication & Authorization

- **JWT**: Access token (15min) + refresh token (7d), HS256, signed with `JWT_SECRET`
- **authMiddleware**: extracts `Bearer` token from `Authorization` header, verifies, attaches `{ sub, role }` to `req.user`
- **rbacMiddleware**: checks `req.user.role` against allowed roles (used for admin-only routes)
- **Register/Login**: returns both tokens; refresh endpoint swaps refresh token for new pair; logout deletes refresh token

## Error Handling

Custom error hierarchy in `src/shared/errors/app-error.ts`:

```
AppError (base, 500)
├── NotFoundError (404)
├── UnauthorizedError (401)
├── ForbiddenError (403)
└── ValidationError (400)
```

`errorHandler` middleware catches all errors. Zod errors → 400 with validation message. AppError subclasses → mapped status code. Unknown errors → 500. `asyncHandler` wraps all controllers to forward async errors.

## Database

PostgreSQL via Drizzle ORM with `postgres.js` driver. Schema in `src/infrastructure/database/drizzle/schema/`:

- `users` — id, email, passwordHash, name, role, createdAt
- `products` — id, name, slug, description, price (NUMERIC), stock, categoryId, imageUrl, isActive, timestamps
- `categories` — id, name, slug, description, timestamps
- `orders` — id, userId, totalAmount, status, timestamps
- `order_items` — id, orderId, productId, productName, productPrice, quantity
- `payments` — id, orderId, amount, status, timestamps
- `inventory_logs` — id, orderId, productId, quantity, action, timestamp
- `notifications` — id, userId, type, title, body, read, createdAt

## Graceful Shutdown

`SIGTERM` and `SIGINT` handlers close the RabbitMQ channel/connection before exiting.

## Commands

```bash
cd backend
npm run dev          # tsx watch src/index.ts
npm run build        # tsc
npm run start        # node dist/index.js
npm run lint         # eslint src/
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
npm run db:generate  # drizzle-kit generate
npm run db:migrate   # drizzle-kit migrate
npm run db:push      # drizzle-kit push
```
