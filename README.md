# ShopFlow — Mini E-Commerce

A production-ready mini e-commerce backend built with Express.js, TypeScript, and Clean Architecture. Designed to demonstrate modern backend engineering patterns while remaining small enough to finish in weeks.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Runtime | Node.js 22, TypeScript 5 |
| Framework | Express.js 5 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 |
| Message Broker | RabbitMQ 4 |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Validation | Zod |
| Testing | Vitest + Supertest |
| Infrastructure | Docker Compose |

## Architecture

```
src/
├── domain/          # Entities, value objects, repository interfaces
├── application/     # Use cases, DTOs, service interfaces
├── infrastructure/  # Database, Redis, RabbitMQ, auth implementations
├── presentation/    # Express routes, controllers, middleware
└── shared/          # Error classes, shared types
```

## Modules

Each module owns its own entity, repository interface, use cases, controller, and routes:

| Module | Description |
|--------|-------------|
| Auth | JWT register, login, refresh, logout + RBAC |
| Categories | CRUD with pagination and search |
| Products | CRUD with search, filter, sort, and stock management |
| Cart | Redis-based shopping cart |
| Orders | Order creation from cart, status management |
| Payments | Payment processing with mock provider |
| Inventory | Stock validation, reduction, and logging |
| Notifications | In-app notifications and email mock |
| Analytics | Revenue, best sellers, daily stats via Redis |
| Admin | Dashboard, user management |

## Getting Started

### Prerequisites

- Node.js 22+
- Docker Desktop

### Setup

```bash
# Start infrastructure (PostgreSQL, Redis, RabbitMQ)
docker compose up -d

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Run database migrations
cd ../backend && npx drizzle-kit migrate

# Start development server
npm run dev
```

The server starts on `http://localhost:3000`.

### Docker Services

| Service | Port | Management UI |
|---------|------|---------------|
| PostgreSQL | 5432 | — |
| Redis | 6379 | — |
| RabbitMQ | 5672, 15672 | http://localhost:15672 (guest/guest) |

## Clean Architecture Layers

```
src/
├── domain/          # Entities, value objects, repository interfaces
├── application/     # Use cases, DTOs, service interfaces  ──┐
├── infrastructure/  # Database, Redis, RabbitMQ, auth        │ inward
├── presentation/    # Express routes, controllers, middleware │ flow
└── shared/          # Error classes, shared types            ──┘
```

Rules:
- **Domain** has zero framework dependencies
- **Application** calls domain interfaces, never infrastructure directly
- **Infrastructure** implements interfaces defined in domain/application
- **Presentation** handles HTTP concerns only
- **Workers** (`infrastructure/rabbitmq/consumers/`) call application use cases, never repos directly

## RabbitMQ Consumers

Each consumer lives in its own file under `src/infrastructure/rabbitmq/consumers/`:

| File | Queue | Bind Key | Purpose |
|------|-------|----------|---------|
| `inventory-consumer.ts` | `inventory.updated` | `order.created` | Validate & reserve stock |
| `payment-consumer.ts` | `payment.request` | `inventory.reserved` | Process payment, rollback on fail |
| `notification-consumer.ts` | `notification.send` | `payment.completed`, `inventory.failed`, `order.shipped`, `order.completed` | Send in-app notifications |
| `analytics-consumer.ts` | `analytics` | `payment.completed` | Track revenue & best sellers |

Queues are declared with dead-letter exchange `shop.dlx` → `shop.dead-letter` for failed messages.

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | No | Register new user |
| POST | `/auth/login` | No | Login |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | No | Logout |

### Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/categories` | No | List all categories |
| POST | `/categories` | Admin | Create category |
| PATCH | `/categories/:id` | Admin | Update category |
| DELETE | `/categories/:id` | Admin | Delete category |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | No | List products (search, filter, paginate) |
| GET | `/products/:id` | No | Get product details |
| POST | `/products` | Admin | Create product |
| PATCH | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Soft-delete product |

### Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | Required | Get cart contents |
| POST | `/cart/items` | Required | Add item to cart |
| PATCH | `/cart/items/:productId` | Required | Update item quantity |
| DELETE | `/cart/items/:productId` | Required | Remove item |
| DELETE | `/cart` | Required | Clear cart |

### Checkout & Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/checkout` | Required | Create order from cart |
| GET | `/orders` | Required | List user's orders |
| GET | `/orders/:id` | Required | Get order details |
| PATCH | `/orders/:id` | Admin | Update order status |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | Required | List notifications |
| PATCH | `/notifications/:id/read` | Required | Mark as read |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/dashboard` | Admin | Dashboard overview |
| GET | `/admin/analytics` | Admin | Revenue and stats |
| GET | `/admin/users` | Admin | List users |
| PATCH | `/admin/users/:id/role` | Admin | Update user role |

## Workflows

### Checkout Flow

```
Customer → POST /checkout → Create Order → Publish "order.created" → RabbitMQ
                                                                           │
                                           ┌───────────────────────────────┤
                                           ▼                               ▼
                                  Inventory Worker                 Payment Worker
                                  (reserve stock)                  (mock payment)
                                           │                               │
                                           ▼                               ▼
                                  "inventory.reserved"           "payment.completed"
                                           │                               │
                                           ▼                               ▼
                                  Payment Worker          Notification Worker
                                  (start processing)       (send email + in-app)
                                                                           │
                                                                           ▼
                                                                  Analytics Worker
                                                          (update revenue, best sellers)
```

### Order Status Lifecycle

```
pending → paid → packing → shipping → completed
    │
    └──→ cancelled (on payment failure or insufficient stock)
```

### Event-Driven Architecture

RabbitMQ exchange: `shop.exchange` (topic)

| Queue | Binding Key | Consumer |
|-------|-------------|----------|
| `inventory.updated` | `order.created` | Inventory Worker |
| `payment.request` | `inventory.reserved` | Payment Worker |
| `payment.*` | `payment.completed`, `payment.failed` | Notification Worker |
| `notification.send` | `payment.completed`, `inventory.failed`, `order.shipped`, `order.completed` | Notification Worker |
| `analytics` | `payment.completed` | Analytics Worker |

### Caching Strategy (Redis)

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `products:*` | 5 min | Product detail/list cache |
| `categories:all` | 10 min | Category list cache |
| `cart:{userId}` | — | Shopping cart (persistent) |
| `rate:{ip}` | 60s | Rate limiting |
| `analytics:*` | — | Analytics counters |
| `analytics:best_sellers` | — | Leaderboard (sorted set) |
| `analytics:daily:{date}` | — | Daily revenue |

### Rate Limiting

- Login/Register: 5 requests per 60 seconds per IP (configurable via `rateLimiter()`)
- Implemented as sliding window counter in Redis

### Background Workers

All workers start automatically with the Express server via `startWorkers()` in `src/infrastructure/workers/index.ts`:

- **Inventory Worker**: Validates stock levels, reduces inventory, logs changes
- **Payment Worker**: Processes mock payments with configurable success rate
- **Notification Worker**: Creates in-app notifications, logs email notifications
- **Analytics Worker**: Updates revenue counters, best seller leaderboard, daily stats

### Error Handling

All errors flow through the global `errorHandler` middleware:

| Error Type | Status Code | Code |
|------------|-------------|------|
| ValidationError | 400 | `VALIDATION_ERROR` |
| UnauthorizedError | 401 | `UNAUTHORIZED` |
| ForbiddenError | 403 | `FORBIDDEN` |
| NotFoundError | 404 | `NOT_FOUND` |
| AppError | varies | Custom |
| Unhandled | 500 | `INTERNAL_ERROR` |

## Commands

All commands run from `backend/`:

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm start            # Run compiled output
npm test             # Run all tests
npm run test:watch   # Watch mode
npm run lint         # ESLint
npm run db:generate  # Generate Drizzle migration
npm run db:migrate   # Apply migrations
```

From `frontend/`:

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Testing

40 tests across 13 test files (sequential, `vitest.config.ts` sets `fileParallelism: false`):

| File | Tests | What it covers |
|------|-------|----------------|
| `health.test.ts` | 1 | Health endpoint |
| `database.test.ts` | 1 | Database connection |
| `auth.test.ts` | 9 | Register, login, refresh, logout, validation |
| `categories.test.ts` | 4 | CRUD + auth gating |
| `products.test.ts` | 5 | CRUD + search + auth gating |
| `inventory.test.ts` | 4 | Reserve stock, release stock, insufficient stock, logs |
| `payments.test.ts` | 1 | Payment processing (success/failure) |
| `orders.test.ts` | 4 | List, get, cancel pending, reject re-cancel |
| `notifications.test.ts` | 2 | List notifications, reject unauthenticated |
| `redis-cache.test.ts` | 2 | Cache get/set/del |
| `cart.test.ts` | 3 | Add, get, clear |
| `checkout.test.ts` | 3 | Order creation, cart clear, order listing |
| `admin-dashboard.test.ts` | 1 | Admin RBAC |

## Project Structure

```
mini-e-commerce/
├── docker-compose.yml         # PostgreSQL, Redis, RabbitMQ, backend, frontend
├── backend/
│   ├── src/
│   │   ├── config/            # Environment, DB, Redis, RabbitMQ config
│   │   ├── domain/            # Entities + repository interfaces (8 modules)
│   │   │   ├── auth/
│   │   │   ├── categories/
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── inventory/
│   │   │   ├── notifications/
│   │   │   └── analytics/
│   │   ├── application/       # Use cases (one per file, ~30 files)
│   │   │   ├── auth/
│   │   │   ├── categories/
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── notifications/
│   │   │   ├── inventory/
│   │   │   ├── payments/
│   │   │   ├── analytics/
│   │   │   └── admin/
│   │   ├── infrastructure/    # Drizzle repos, Redis, RabbitMQ consumers, auth
│   │   │   ├── rabbitmq/consumers/   # 4 consumer files, one per queue
│   │   ├── presentation/      # Routes, controllers, middleware
│   │   ├── shared/            # Errors, types
│   │   └── tests/             # 13 test files, 40 tests
│   ├── Dockerfile
│   ├── drizzle.config.ts
│   ├── vitest.config.ts
│   └── package.json
├── frontend/                  # Next.js 16 + React 19 + Tailwind v4 + shadcn/ui
│   ├── src/app/               # 19 routes (public, auth, admin)
│   ├── src/components/        # UI components + business components
│   ├── src/lib/               # API client, auth helpers
│   ├── Dockerfile
│   └── package.json
└── docs/
    ├── PLAN.md                # Architecture plan
    ├── FRONTEND-AUDIT.md      # React best-practices audit
    └── GAP-ANALYSIS.md        # Implementation gap tracker
```
