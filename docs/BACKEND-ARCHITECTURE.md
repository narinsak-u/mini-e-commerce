# Backend Architecture & Workflows

Express.js + TypeScript modular monolith using **Clean Architecture**. PostgreSQL (Drizzle ORM) for persistence, Redis for cache/cart/analytics/rate-limiting, RabbitMQ for event-driven background workers.

---

## Layer Architecture

### The Dependency Rule

```
┌──────────────────────────────────────────────────┐
│                  Presentation                     │
│  (routes, controllers, middleware)                │
│  Depends on: Application                         │
├──────────────────────────────────────────────────┤
│                  Application                      │
│  (use cases, DTOs, service interfaces)            │
│  Depends on: Domain (interfaces)                  │
├──────────────────────────────────────────────────┤
│                  Domain                           │
│  (entities, repository interfaces, value objects) │
│  Depends on: nothing                             │
├──────────────────────────────────────────────────┤
│                Infrastructure                     │
│  (Drizzle repos, Redis, RabbitMQ, JWT, bcrypt)    │
│  Implements: Domain + Application interfaces     │
└──────────────────────────────────────────────────┘
```

**The golden rule:** `Domain` never imports from `Infrastructure`. Ever. Application depends only on interfaces defined in Domain. Infrastructure exists to implement those interfaces. Routes wire everything at the edge.

### How a Request Flows Through the Layers

```
HTTP Request
    │
    ▼
┌──────────────────────┐
│  1. Route            │  Routes are the composition root: they instantiate
│  (routes/*.ts)       │  repos (infra) → create use cases (application) →
│                      │  create controller (presentation) → attach middleware.
│                      │  Example: routes/products.ts wires createProductUseCase(repo)
│                      │  into the POST /products handler.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  2. Middleware        │  Express middleware pipeline runs in order:
│  (middleware/*.ts)    │  auth (JWT verify) → rbac (role check) → controller.
│                      │  authMiddleware attaches { sub, role } to req.user.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  3. Controller        │  Thin layer. Parses req.params/body/query,
│  (controllers/*.ts)   │  calls use case, sends res.status().json().
│                      │  Every method is wrapped in asyncHandler which
│                      │  catches thrown errors → errorHandler middleware.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  4. Use Case          │  One function per file. Accepts domain interfaces
│  (application/*.ts)   │  via constructor injection. Validates input with Zod.
│                      │  Orchestrates business logic by calling domain entities
│                      │  and repository interfaces. Never imports infrastructure.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  5. Domain Entity     │  Pure data + pure functions. No I/O, no framework deps.
│  (domain/*/entity.ts) │  Factory functions (createProduct, reduceStock) return
│                      │  new entity instances. Validation rules live here.
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  6. Repository (iface)│  Interface defined in Domain. Method signatures only.
│  (domain/*/repo.ts)   │  Example: IProductRepository { findById, save, update }
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  7. Repository (impl) │  Concrete implementation in Infrastructure.
│  (infra/drizzle/*)    │  Drizzle queries, Redis commands, HTTP calls.
│                      │  Implements the interface from step 6.
└──────────────────────┘
```

### Dependency Injection (without a container)

Every use case is a **factory function** that takes interfaces and returns a **handler function**:

```ts
// application/products/create-product.ts
export function createProductUseCase(repo: IProductRepository) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const product = createProduct(data);      // domain entity factory
    await repo.save(product);                 // infra (behind interface)
    return product;
  };
}
```

Routes wire the chain at startup:

```ts
// presentation/routes/products.ts
const repo = createDrizzleProductRepo();                // infrastructure
const controller = createProductController(             // presentation
  createProductUseCase(repo),                           // application
  listProductsUseCase(repo),
);
router.post("/", authMiddleware, rbacMiddleware("admin"), controller.create);
```

Tests swap real repos for mocks by calling the same use case factory with a test double.

---

## Module Workflows

### Authentication

```
POST /auth/register
  Body: { name, email, password }
  1. Zod validates input (email format, password ≥ 6 chars)
  2. Checks duplicate email → 400 if exists
  3. Hashes password (bcrypt, cost 12)
  4. Creates User entity with random UUID, role="customer"
  5. Saves to PostgreSQL
  6. Signs access token (15min) + refresh token (7d)
  7. Returns { user, accessToken, refreshToken }

POST /auth/login
  Body: { email, password }
  1. Looks up user by email → 401 if not found
  2. Compares bcrypt hash → 401 if mismatch
  3. Signs token pair
  4. Returns { user, accessToken, refreshToken }

POST /auth/refresh
  Body: { refreshToken }
  1. Verifies refresh token signature and expiry → 401 if invalid
  2. Confirms user still exists → 401 if deleted
  3. Signs new token pair
  4. Returns { accessToken, refreshToken }

POST /auth/logout
  Body: { refreshToken }
  1. Accepts (and ignores) the refresh token
  ponytail: no server-side token invalidation. Add a Redis blacklist
  when refresh-token-level logout is required.
```

### Products

```
GET /products?page=1&limit=10&q=search&categoryId=...&sortBy=price&sortOrder=desc
  1. Validates query params
  2. Calls findMany with filters → paginated Drizzle query with left join on categories
  3. Returns { data: Product[], total, page, limit }
     Note: only isActive=true products are returned (soft-delete)

POST /products (admin)
  Body: { name, price, description?, stock?, categoryId?, imageUrl? }
  1. Zod validates input (name required, price > 0, etc.)
  2. Generates slug from name (lowercased, hyphenated, sanitized)
  3. Checks slug uniqueness → 400 if duplicate
  4. Creates Product entity via factory (default stock=0, isActive=true)
  5. Saves to PostgreSQL
  6. Returns 201 + Product JSON

PATCH /products/:id (admin)
  1. Finds product by ID → 404 if missing
  2. Applies partial update via updateProduct() entity function
  3. Persists to PostgreSQL
  4. Invalidates Redis product cache

DELETE /products/:id (admin)
  1. Sets isActive=false (soft delete)
  2. Invalidates Redis product cache
```

### Cart (Redis-backed)

Cart data lives entirely in Redis hashes (`cart:{userId}`). No PostgreSQL writes for cart operations.

```
GET /cart
  1. Reads hash `cart:{userId}` from Redis
  2. Each field is productId → quantity
  3. Looks up product names/prices from Redis product cache
  4. Computes total = sum(price × quantity)
  5. Returns { items: CartItem[], total: number }

POST /cart/items  Body: { productId, quantity }
  1. Validates product exists (optional, depends on cache availability)
  2. Increments quantity in Redis hash via HINCRBY
  3. Returns fresh cart

PATCH /cart/items/:productId  Body: { quantity }
  1. Sets quantity via HSET (if ≤ 0, removes via HDEL)
  2. Returns fresh cart

DELETE /cart/items/:productId
  1. Removes field via HDEL
  2. Returns fresh cart

DELETE /cart
  1. Runs DEL on `cart:{userId}`
  2. Returns empty cart
```

### Checkout & Orders

```
POST /checkout  (the most complex flow)
  1. createOrderUseCase:
     a. cartRepo.findByUserId(userId) → throws if empty
     b. createOrder({ userId, totalAmount }) → domain entity (status="pending")
     c. orderRepo.save(order) → PostgreSQL
     d. For each cart item: createOrderItem() → orderRepo.saveItem()
     e. cartRepo.clear(userId) → Redis
     f. publishEvent("order.created", { orderId, items, totalAmount }) → RabbitMQ
     g. Returns order with items

  2. RabbitMQ delivers "order.created" to inventory.updated queue
     → Inventory Consumer (see Event-Driven Workflows below)

  3. Worker chain continues asynchronously while the HTTP response
     is already returned to the customer (201 + order JSON).

GET /orders
  1. orderRepo.findByUserId(userId, page, limit) → paginated

GET /orders/:id
  1. orderRepo.findById(id) → 404 if missing
  2. Returns order with items

PATCH /orders/:id (admin)  Body: { status }
  1. Zod validates against OrderStatus enum
  2. orderRepo.updateStatus(id, status)

POST /orders/:id/cancel (customer)
  1. cancelOrderUseCase:
     a. Finds order → 404 if missing
     b. Checks userId matches token → 403 if different user
     c. Checks status === "pending" → 400 if already processed
     d. Sets status to "cancelled"
     e. Returns updated order
```

### Notifications

```
GET /notifications
  1. notificationRepo.findByUserId(userId) → paginated
  2. Returns { data: Notification[], total }

PATCH /notifications/:id/read
  1. notificationRepo.markRead(id)
  2. Returns success
```

### Admin

```
GET /admin/analytics
  1. analyticsStore.getAnalytics() → reads from Redis:
     - analytics:revenue (string counter)
     - analytics:total_orders (string counter)
     - analytics:best_sellers (sorted set, ZREVRANGE)
     - analytics:daily:YYYY-MM-DD (string counter)
  2. Returns { revenue, totalOrders, bestSellers, dailyRevenue }

GET /admin/users
  1. userRepo.findAll(page, limit) → paginated

PATCH /admin/users/:id/role  Body: { role }
  1. userRepo.updateRole(id, role)
  2. Returns updated user
```

---

## Event-Driven Workflows (RabbitMQ)

### Exchange Topology

```
Exchange: shop.exchange (topic, durable)
    │
    ├── routing key: "order.created"
    │   └── Queue: inventory.updated (DLX: shop.dlx)
    │
    ├── routing key: "inventory.reserved"
    │   └── Queue: payment.request (DLX: shop.dlx)
    │
    ├── routing keys: "payment.completed", "inventory.failed",
    │                  "order.shipped", "order.completed"
    │   └── Queue: notification.send (DLX: shop.dlx)
    │
    └── routing key: "payment.completed"
        └── Queue: analytics (DLX: shop.dlx)

Dead-letter exchange: shop.dlx (fanout)
    └── Queue: shop.dead-letter (messages land here on nack/expiry)
```

### Full Checkout Event Chain

```
HTTP Request (synchronous)
┌─────────────────────────────────────────┐
│  POST /checkout                          │
│  → Create order in PostgreSQL            │
│  → Clear Redis cart                      │
│  → Publish "order.created" event         │
│  ← 201 Order JSON (response sent)        │
└─────────────────────────────────────────┘
                                           │
              ┌────────────────────────────┤
              │  "order.created"            │
              ▼                             ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│ Inventory Consumer      │    │   (other consumers      │
│ (inventory.updated q)   │    │    ignore this key)      │
│                         │    │                          │
│ 1. Parse { orderId,     │    │                          │
│      items }            │    │                          │
│ 2. For each item:       │    │                          │
│    a. productRepo       │    │                          │
│       .findById()       │    │                          │
│    b. reduceStock()     │    │                          │
│       → null? nack DLQ  │    │                          │
│    c. productRepo       │    │                          │
│       .update()         │    │                          │
│    d. inventoryRepo     │    │                          │
│       .save(log)        │    │                          │
│ 3. Publish              │    │                          │
│    "inventory.reserved" │    │                          │
└──────────┬──────────────┘    └─────────────────────────┘
           │
           │  "inventory.reserved"
           ▼
┌─────────────────────────┐
│ Payment Consumer        │
│ (payment.request q)     │
│                         │
│ 1. orderRepo.findById() │
│ 2. processPayment():    │
│    a. Create payment    │
│       record (pending)  │
│    b. Simulate gateway  │
│       (100ms delay)     │
│    c. Random success    │
│       (90% chance)      │
│                         │
│   ┌─── ON SUCCESS ──┐   │
│   │ Publish          │   │
│   │ "payment.com-    │   │
│   │ pleted"          │   │
│   │ trackPayment()   │   │
│   │ (analytics)      │   │
│   └─────────────────┘   │
│                         │
│   ┌─── ON FAILURE ──┐   │
│   │ Publish          │   │
│   │ "payment.failed" │   │
│   │ releaseStock()   │   │
│   │ (restore inv.)   │   │
│   └─────────────────┘   │
└──────┬──────────┬───────┘
       │          │
       │          │  "payment.failed"
       │          ▼
       │   (Inventory restored,
       │    order stays "pending"
       │    for manual review)
       │
       │  "payment.completed"
       ▼
┌─────────────────────┐   ┌─────────────────────┐
│ Notification        │   │ Analytics Consumer  │
│ (notification.send) │   │ (analytics queue)   │
│                     │   │                     │
│ 1. Fetch order      │   │ 1. trackPayment():  │
│ 2. Save in-app      │   │    Redis:           │
│    notification     │   │    • INCR revenue   │
│    (PostgreSQL)     │   │    • INCR orders    │
│ 3. Log mock email   │   │    • ZINCRBY best   │
│    to stdout        │   │      sellers        │
│                     │   │    • INCRBY daily   │
│                     │   │      revenue        │
└─────────────────────┘   └─────────────────────┘
```

### Worker Implementation

Each consumer is a separate factory in `src/infrastructure/rabbitmq/consumers/`:

| File | Queue | Purpose |
|------|-------|---------|
| `inventory-consumer.ts` | `inventory.updated` | Validate stock, deduct, log, publish next event |
| `payment-consumer.ts` | `payment.request` | Mock payment gateway, update DB, publish result |
| `notification-consumer.ts` | `notification.send` | Save in-app notification, log email |
| `analytics-consumer.ts` | `analytics` | Update Redis counters |

All consumers follow the same pattern:
1. Bind queue to exchange with routing key
2. Register consumer callback
3. Parse message → call application use case → ack on success
4. On error: log + nack (no requeue) → message lands in `shop.dead-letter`

The orchestrator in `src/infrastructure/workers/index.ts` creates repos and starts all consumers in parallel via `Promise.all`.

---

## Redis Responsibilities

| Feature | Key Pattern | TTL | Details |
|---------|-------------|-----|---------|
| Product cache | `products:*` | 5 min | Get/set around findById and findMany |
| Shopping cart | `cart:{userId}` | none (persistent) | Redis hash: field=productId, value=quantity |
| Analytics revenue | `analytics:revenue` | none | INCRBY float counter |
| Analytics orders | `analytics:total_orders` | none | INCR counter |
| Analytics best sellers | `analytics:best_sellers` | none | ZINCRBY sorted set |
| Analytics daily | `analytics:daily:{date}` | none | INCRBY float |
| Rate limiting | `rate:{userId}` | 60s | Sliding window via sorted set |
| Session cache | `session:{tokenHash}` | 7 days | JSON string, refresh TTL on access |

**Rule:** Redis never replaces PostgreSQL. It's a cache/auxiliary store. Cart uses Redis for performance (fast reads/writes) but order data is always in PostgreSQL.

---

## Authentication & Authorization

```
JWT Token Payload: { sub: string (userId), role: "customer" | "admin" }
                    signed with HS256 + JWT_SECRET

Access token:  15min expiry (configurable via JWT_EXPIRES_IN)
Refresh token: 7d expiry (configurable via JWT_REFRESH_EXPIRES_IN)
```

### Middleware Pipeline

```
1. authMiddleware:
   - Extracts "Bearer <token>" from Authorization header
   - jwt.verify(token) → payload or throws
   - Attaches payload to req.user
   - 401 if missing/invalid/expired

2. rbacMiddleware("admin"):
   - Checks req.user.role === "admin"
   - 403 if insufficient role
```

### Rate Limiting

Login and register endpoints are rate-limited via Redis sliding window:
- 100 requests per 60 seconds per IP (configurable)
- Implemented in `src/infrastructure/redis/rate-limiter.ts`

---

## Error Handling

### Error Hierarchy

```
AppError (base, statusCode defaults to 500)
├── NotFoundError      (404, code: "NOT_FOUND")
├── UnauthorizedError  (401, code: "UNAUTHORIZED")
├── ForbiddenError     (403, code: "FORBIDDEN")
└── ValidationError    (400, code: "VALIDATION_ERROR")
```

### Error Flow

```
Controller → throws AppError subclass
  → asyncHandler catches it
  → errorHandler middleware:
    - AppError → status from error, JSON: { error: { code, message } }
    - ZodError → 400 with formatted validation messages
    - Unknown → 500, logged to console
```

### Response Format

All errors return: `{ error: { code: string, message: string } }`
Successful responses return the entity/collection directly (no wrapper).

---

## Database Schema

PostgreSQL tables defined in `src/infrastructure/database/drizzle/schema/`:

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id (UUID PK), email (unique), password_hash, name, role | role enum: customer, admin |
| `products` | id (UUID PK), name, slug (unique), price (NUMERIC), stock, category_id (FK), is_active | Soft-delete via is_active |
| `categories` | id (UUID PK), name, slug (unique), description | |
| `orders` | id (UUID PK), user_id (FK), status (enum), total_amount (NUMERIC) | Status: pending → paid → packing → shipping → completed, or cancelled |
| `order_items` | id (UUID PK), order_id (FK), product_id, product_name (snapshot), quantity | Prices snapshot at order time |
| `payments` | id (UUID PK), order_id (FK), amount, status (enum) | Status: pending, success, failed |
| `inventory_logs` | id (UUID PK), order_id (FK), product_id (FK), quantity_change, type | Type: reserve, release, restock |
| `notifications` | id (UUID PK), user_id (FK), type, title, body, read | |

---

## Key Design Decisions

1. **One use case per file** — keeps them small, composable, testable. A use case that grows too large signals a missing domain concept.

2. **No ORM in domain** — domain entities are plain TypeScript interfaces + factory functions. Drizzle schema is infrastructure-only.

3. **RabbitMQ for async, not sync** — checkout returns immediately after saving the order. Workers process inventory/payment/notifications in the background. If a worker fails, the order still exists in PostgreSQL with status "pending".

4. **Cart in Redis** — shopping carts are high-write, short-lived, and don't need ACID. Redis hashes provide fast read/write with no schema changes.

5. **Dead letter queue** — every worker queue routes nacked messages to `shop.dead-letter` via `shop.dlx`. Failed messages don't get lost — they accumulate for inspection.

6. **No DI container** — factory functions + manual wiring at route level. Keeps dependencies explicit, no magic, easy to debug. The "composition root" pattern is explicit in every route file.

---

## Inter-Service Communication Contracts

### Event Payloads

Every message flows through `shop.exchange` (topic). Producers call `publishEvent(routingKey, payload)` from `src/config/rabbitmq.ts`. Consumers parse the JSON buffer.

#### `order.created`

**Producer:** `createOrderUseCase` (application/orders/use-cases/create-order.ts)
**Consumer:** Inventory consumer

```ts
{
  orderId: string;        // UUID
  userId: string;         // UUID
  items: Array<{
    productId: string;    // UUID
    quantity: number;     // units ordered
    price: number;        // unit price at time of order
  }>;
  totalAmount: number;    // cart total
}
```

#### `inventory.reserved`

**Producer:** Inventory consumer (infrastructure/rabbitmq/consumers/inventory-consumer.ts)
**Consumer:** Payment consumer

```ts
{
  orderId: string;        // UUID — only the orderId, items already deducted
}
```

#### `inventory.failed`

**Producer:** Would be emitted by inventory consumer on stock validation failure (currently nacks to DLQ instead)
**Consumer:** Notification consumer (bound to this key)

```ts
{
  orderId: string;
  reason: string;         // e.g. "Insufficient stock for product xyz"
}
```

#### `payment.completed`

**Producer:** Payment consumer (infrastructure/rabbitmq/consumers/payment-consumer.ts)
**Consumers:** Notification consumer, Analytics consumer

```ts
{
  orderId: string;        // UUID
  amount: number;         // payment amount (order total)
}
```

#### `payment.failed`

**Producer:** Payment consumer
**Consumer:** Notification consumer (bound to this key, but currently only handles payment_success type)

```ts
{
  orderId: string;        // UUID
}
```

#### `order.shipped` / `order.completed`

**Producer:** Would be emitted by order status update use case (currently only published as routing keys for notification binding)
**Consumer:** Notification consumer

```ts
{
  orderId: string;
}
```

### HTTP Request/Response Contracts

#### Auth

| Endpoint | Request Body | Success Response | Error |
|----------|-------------|-----------------|-------|
| `POST /auth/register` | `{ name, email, password }` | `201 { user: { id, email, name, role }, accessToken, refreshToken }` | `400` duplicate email, validation |
| `POST /auth/login` | `{ email, password }` | `200 { user: { id, email, name, role }, accessToken, refreshToken }` | `401` invalid credentials |
| `POST /auth/refresh` | `{ refreshToken }` | `200 { accessToken, refreshToken }` | `401` invalid/expired token |
| `POST /auth/logout` | `{ refreshToken }` | `200 { message }` | — |

#### Products

| Endpoint | Auth | Request | Success Response |
|----------|------|---------|-----------------|
| `GET /products` | No | Query: `page, limit, q, categoryId, sortBy, sortOrder` | `{ data: Product[], total, page, limit }` |
| `GET /products/:id` | No | — | `ProductWithCategory` |
| `POST /products` | Admin | `{ name, price, description?, stock?, categoryId?, imageUrl? }` | `201 Product` |
| `PATCH /products/:id` | Admin | Partial product fields | `Product` |
| `DELETE /products/:id` | Admin | — | `204` |

#### Cart

| Endpoint | Auth | Request | Success Response |
|----------|------|---------|-----------------|
| `GET /cart` | Yes | — | `{ items: CartItem[], total }` |
| `POST /cart/items` | Yes | `{ productId, quantity }` | `{ items: CartItem[], total }` |
| `PATCH /cart/items/:id` | Yes | `{ quantity }` | `{ items: CartItem[], total }` |
| `DELETE /cart/items/:id` | Yes | — | `{ items: CartItem[], total }` |
| `DELETE /cart` | Yes | — | `{ items: [], total: 0 }` |

#### Checkout & Orders

| Endpoint | Auth | Request | Success Response |
|----------|------|---------|-----------------|
| `POST /checkout` | Yes | — | `201 Order` (triggers event chain) |
| `GET /orders` | Yes | Query: `page, limit` | `{ data: Order[], total, page, limit }` |
| `GET /orders/:id` | Yes | — | `Order` |
| `POST /orders/:id/cancel` | Yes | — | `Order` (only if status=pending) |
| `PATCH /orders/:id` | Admin | `{ status }` | `Order` |

#### Notifications

| Endpoint | Auth | Success Response |
|----------|------|-----------------|
| `GET /notifications` | Yes | `{ data: Notification[], total }` |
| `PATCH /notifications/:id/read` | Yes | `{ success: true }` |

#### Admin

| Endpoint | Auth | Success Response |
|----------|------|-----------------|
| `GET /admin/analytics` | Admin | `{ revenue, totalOrders, bestSellers, dailyRevenue }` |
| `GET /admin/users` | Admin | `{ data: User[], total, page, limit }` |
| `PATCH /admin/users/:id/role` | Admin | `User` |

### Service Communication Diagram (all paths)

```
                         ┌──────────────┐
                         │   Frontend   │
                         │  (React/Vite)│
                         └──────┬───────┘
                                │ HTTP (JSON)
                                ▼
┌───────────────────────────────────────────────────────────┐
│                     Express Server                         │
│                                                            │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐  │
│  │  Auth    │   │ Products │   │   Cart   │   │ Orders │  │
│  │ Routes  │   │  Routes  │   │  Routes  │   │ Routes │  │
│  └────┬────┘   └────┬─────┘   └────┬─────┘   └───┬────┘  │
│       │              │              │              │        │
│       ▼              ▼              ▼              ▼        │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌────────┐  │
│  │  Auth   │   │ Product  │   │   Cart   │   │ Order  │  │
│  │ UseCases│   │ UseCases │   │ UseCases │   │UseCases│  │
│  └────┬────┘   └────┬─────┘   └────┬─────┘   └───┬────┘  │
│       │              │              │              │        │
│       ▼              ▼              ▼              ▼        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              Domain Interfaces                       │  │
│  │  IUserRepo  IProductRepo  ICartRepo  IOrderRepo     │  │
│  └──────────────────────┬──────────────────────────────┘  │
│                         │                                  │
│       ┌─────────────────┼──────────────────┐               │
│       ▼                 ▼                  ▼               │
│  ┌──────────┐   ┌──────────────┐   ┌────────────┐        │
│  │PostgreSQL│   │    Redis     │   │  RabbitMQ  │        │
│  │ (Drizzle)│   │(cache/cart/  │   │ (exchange) │        │
│  │          │   │ analytics)   │   │            │        │
│  └──────────┘   └──────────────┘   └─────┬──────┘        │
└──────────────────────────────────────────┼─────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
            │  Inventory   │     │   Payment    │     │ Notification │
            │  Consumer    │     │   Consumer   │     │   Consumer   │
            │              │     │              │     │              │
            │ Reads:       │     │ Reads:       │     │ Reads:       │
            │  PostgreSQL  │     │  PostgreSQL  │     │  PostgreSQL  │
            │              │     │              │     │              │
            │ Writes:      │     │ Writes:      │     │ Writes:      │
            │  PostgreSQL  │     │  PostgreSQL  │     │  PostgreSQL  │
            │              │     │              │     │              │
            │ Publishes:   │     │ Publishes:   │     │ Publishes:   │
            │  inventory.  │     │  payment.    │     │  (none)      │
            │  reserved    │     │  completed   │     │              │
            │              │     │  payment.    │     │              │
            │              │     │  failed      │     │              │
            └──────────────┘     └──────────────┘     └──────────────┘
                    │                    │
                    │                    │  "payment.completed"
                    │                    ├──────────────────────┐
                    │                    │                      │
                    │                    ▼                      ▼
                    │           ┌──────────────┐     ┌──────────────┐
                    │           │  Analytics   │     │ Notification │
                    │           │  Consumer    │     │   Consumer   │
                    │           │              │     │              │
                    │           │ Reads:       │     │ (same queue  │
                    │           │  PostgreSQL  │     │  as above)   │
                    │           │              │     │              │
                    │           │ Writes:      │     │              │
                    │           │  Redis only  │     │              │
                    │           └──────────────┘     └──────────────┘
                    │
                    │  "payment.failed"
                    ▼
            ┌──────────────┐
            │  Inventory   │
            │  Consumer    │
            │  (release    │
            │   stock)     │
            └──────────────┘
```

### Data Flow per Checkout (step by step)

| Step | Service | Action | Data Written | Data Read |
|------|---------|--------|-------------|-----------|
| 1 | Express | POST /checkout | orders + order_items (PG), clears cart:userId (Redis) | cart:userId (Redis) |
| 2 | Express | Publish event | `order.created` → RabbitMQ | — |
| 3 | Express | Return response | — | — |
| 4 | Inventory Consumer | Consume `order.created` | products.stock (PG), inventory_logs (PG) | products (PG) |
| 5 | Inventory Consumer | Publish event | `inventory.reserved` → RabbitMQ | — |
| 6 | Payment Consumer | Consume `inventory.reserved` | payments (PG), orders.status (PG) | orders (PG) |
| 7a | Payment Consumer | On success: publish | `payment.completed` → RabbitMQ | — |
| 7b | Payment Consumer | On failure: publish | `payment.failed` → RabbitMQ, restore products.stock (PG) | — |
| 8 | Notification Consumer | Consume `payment.completed` | notifications (PG) | orders (PG) |
| 9 | Analytics Consumer | Consume `payment.completed` | Redis counters (revenue, orders, daily, best sellers) | orders (PG) |

### Dead Letter Flow

```
Any consumer throws → nack(msg, false, false)
    → message routed to shop.dlx (fanout exchange)
    → lands in shop.dead-letter queue
    → accumulates for manual inspection (no consumer on DLQ)
```

Messages in the DLQ can be inspected via RabbitMQ management UI (`http://localhost:15672`). No automatic retry — failures require manual investigation and re-publish.
