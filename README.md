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

Clean Architecture rules:
- **Domain** has zero framework dependencies
- **Application** coordinates business logic through use cases
- **Infrastructure** implements interfaces defined in domain/application
- **Presentation** handles HTTP concerns only
- Dependencies flow inward: presentation → application → domain

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

29 tests across 9 test files:

| File | Tests | What it covers |
|------|-------|----------------|
| `health.test.ts` | 1 | Health endpoint |
| `database.test.ts` | 1 | Database connection |
| `auth.test.ts` | 9 | Register, login, refresh, logout, validation |
| `categories.test.ts` | 4 | CRUD + auth gating |
| `products.test.ts` | 5 | CRUD + search + auth gating |
| `redis-cache.test.ts` | 2 | Cache get/set/del |
| `cart.test.ts` | 3 | Add, get, clear |
| `checkout.test.ts` | 3 | Order creation, cart clear, order listing |
| `admin-dashboard.test.ts` | 1 | Admin RBAC |

## Project Structure

```
mini-e-commerce/
├── docker-compose.yml         # PostgreSQL, Redis, RabbitMQ
├── backend/
│   ├── src/
│   │   ├── config/            # Environment, DB, Redis, RabbitMQ config
│   │   ├── domain/            # Entities + repository interfaces
│   │   │   ├── auth/
│   │   │   ├── categories/
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── inventory/
│   │   │   └── notifications/
│   │   ├── application/       # Use cases (one per file)
│   │   │   ├── auth/
│   │   │   ├── categories/
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── notifications/
│   │   │   └── admin/
│   │   ├── infrastructure/    # Drizzle repos, Redis, RabbitMQ, auth
│   │   ├── presentation/      # Routes, controllers, middleware
│   │   ├── shared/            # Errors, types
│   │   └── tests/             # Integration tests
│   ├── drizzle.config.ts
│   ├── vitest.config.ts
│   └── package.json
├── frontend/                  # Vite + React 19 + TypeScript 6
│   └── ...                    # (not yet implemented)
└── docs/
    ├── PLAN.md                # Architecture plan
    └── superpowers/
        ├── specs/             # Design documents
        └── plans/             # Implementation plans (13 phases)
```
