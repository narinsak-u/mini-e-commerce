# Implementation Gap Analysis

> Cross-reference between PLAN.md spec and current codebase state.
> Generated 2025-07-18

---

## 1. Backend — Missing Application Use Cases

PLAN.md mandates **one use case per file** for every module. These directories exist but are **empty**:

| Directory | Status | What's Missing |
|-----------|--------|----------------|
| `src/application/inventory/use-cases/` | 🔴 **Empty** | `reserve-stock.ts`, `release-stock.ts` |
| `src/application/payments/use-cases/` | 🔴 **Empty** | `process-payment.ts`, `handle-payment-callback.ts` |

The **worker code** in `src/infrastructure/workers/index.ts` does inventory deduction and payment simulation directly (inline), bypassing the application/use-case layer. This violates Clean Architecture — workers should call use cases, not repositories directly.

### 1a. Inventory use cases needed

- `reserve-stock.ts` — validate stock ≥ quantity, deduct, log inventory, publish `inventory.reserved`
- `release-stock.ts` — restore stock on cancellation/failure, log inventory

### 1b. Payments use cases needed

- `process-payment.ts` — create payment record, simulate gateway, update order status
- `handle-payment-callback.ts` — handle webhook/success/failure, publish events

### 1c. Analytics module missing entirely

PLAN.md specifies an analytics worker consuming from an `analytics` queue. Currently analytics logic (revenue increment, best seller tracking) is inlined in the payment worker. No dedicated:

- `src/application/analytics/` directory
- `src/domain/analytics/` entities/repositories
- Analytics worker class consuming from dedicated queue

---

## 2. Backend — Tests Missing

PLAN.md: "Tests before next phase."

| Test File | Status |
|-----------|--------|
| `src/tests/health.test.ts` | ✅ Exists |
| `src/tests/database.test.ts` | ✅ Exists |
| `src/tests/auth.test.ts` | ✅ Exists |
| `src/tests/categories.test.ts` | ✅ Exists |
| `src/tests/products.test.ts` | ✅ Exists |
| `src/tests/cart.test.ts` | ✅ Exists |
| `src/tests/checkout.test.ts` | ✅ Exists |
| `src/tests/admin-dashboard.test.ts` | ✅ Exists |
| `src/tests/redis-cache.test.ts` | ✅ Exists |
| **Inventory tests** | 🔴 Missing |
| **Payments tests** | 🔴 Missing |
| **Notifications tests** | 🔴 Missing |
| **Orders tests** | 🔴 Missing (checkout test covers partial) |
| **Worker tests** | 🔴 Missing |
| **RabbitMQ integration tests** | 🔴 Missing |

---

## 3. Backend — Workers Not Fully Factored

PLAN.md specifies 4 workers:

| Worker | Queue | Status |
|--------|-------|--------|
| **Inventory** | `inventory.updated` | ⚠️ Inline in `workers/index.ts`, no use-case layer |
| **Payment** | `payment.request` | ⚠️ Inline in `workers/index.ts`, no use-case layer |
| **Notification** | `notification.send` | ⚠️ Inline, only handles `payment_success` type |
| **Analytics** | `analytics` | 🔴 **Missing** — no dedicated consumer |

The worker file mixes concerns: all logic is in one function (`startWorkers`), not split into separate worker classes/modules. Dead letter queue not wired. PLAN.md specifies `dead-letter` queue — not present.

---

## 4. Backend — Redis Usage vs PLAN.md

| Feature | PLAN.md | Actual |
|---------|---------|--------|
| Product/Homepage cache | ✅ Yes | `cache-service.ts` exists |
| Shopping cart in Redis | ✅ Yes | `cart-repository.ts` exists |
| Session storage | ✅ `session:user:15` | 🔴 **Missing** — no session store |
| Rate limiting | ✅ `rate:user:15` | `rate-limiter.ts` exists |
| Best seller leaderboard (sorted set) | ✅ | `analytics-store.ts` exists |

---

## 5. Frontend — Missing Features vs PLAN.md

| Feature | PLAN.md | Actual | Gap |
|---------|---------|--------|-----|
| **TanStack Query** | ✅ Planned | ❌ Not used | Raw `useEffect` + `useState` for all data fetching |
| **Zustand** | ✅ Planned | ❌ Not used | No client state management |
| **Product filtering UI** | ✅ Search, filter | ⚠️ Partial | Search + category filter exists, but no sort UI, no pagination |
| **Categories list page** | ✅ List categories | ❌ **Missing** | No `/categories` route; only category filter in product search |
| **Cart persists refresh** | ✅ Survives refresh | ❌ **Missing** | Cart stored in Redis backend but not re-fetched properly on page load (already uses `api("/cart")` on mount — actually this works) |
| **Order cancellation** | ✅ Cancel order | ❌ **Missing** | No cancel button on order detail page |
| **Admin create/edit products** | ✅ CRUD | ⚠️ Partial | Admin product list view exists but no create/edit forms |
| **Admin order status update** | ✅ Update status | ⚠️ Partial | API exists, no frontend UI for updating status |
| **Notification read/unread** | ✅ Read/unread | ⚠️ Partial | API exists, no frontend toggle to mark as read |
| **Loading/skeleton states** | — | ❌ **Missing** | Server components have no loading states, cart/checkout show "Loading..." text |
| **Error boundaries** | — | ❌ **Missing** | No error boundaries anywhere |
| **Payment flow UI** | ✅ Mock payment | ❌ **Missing** | Checkout page just posts to `/checkout`, no payment UX |

---

## 6. Infrastructure — Docker

| Service | Status |
|---------|--------|
| PostgreSQL 16 | ✅ In `docker-compose.yml` |
| Redis 7 | ✅ In `docker-compose.yml` |
| RabbitMQ 4 | ✅ In `docker-compose.yml` |
| Backend Dockerfile | ✅ Exists but `dist/index.js` path may be wrong (no `src/index.ts` in dist) |
| Frontend container | ❌ **Missing** — no Dockerfile or service in compose |

---

## 7. Implementation Progress

| Item | Status | When |
|------|--------|------|
| Inventory use cases (`reserve-stock`, `release-stock`) | ✅ Done | 2025-07-18 |
| Payments use case (`process-payment`) | ✅ Done | 2025-07-18 |
| Workers refactored to use use cases | ✅ Done | 2025-07-18 |
| Analytics module (domain + use case) | ✅ Done | 2025-07-18 |
| Analytics worker (dedicated consumer) | ✅ Done | 2025-07-18 |
| Dead letter queue | 🔴 Still missing | — |
| Redis session store | 🔴 Still missing | — |
| Frontend: categories page | 🔴 Still missing | — |
| Frontend: error boundaries | 🔴 Still missing | — |
| Frontend admin CRUD forms | 🔴 Still missing | — |
| Missing tests | 🔴 Still missing | — |
| Frontend Docker container | 🔴 Still missing | — |

### Remaining gaps

### 🔴 HIGH

1. **Frontend: no error boundaries or loading states** on any page
2. **No dead letter queue** — PLAN.md specifies for production hardening

### 🟡 MEDIUM

3. **Missing tests**: inventory, payments, notifications, orders, workers, RabbitMQ
4. **No session store in Redis** — PLAN.md specifies `session:user:15`
5. **Frontend: no create/edit product forms** in admin
6. **Frontend: no order cancellation UI**
7. **Frontend: no categories browse page**

### 🟢 LOW

8. **Frontend: no TanStack Query or Zustand** (works fine without for this size)
9. **No frontend Docker container**
10. **Notification worker only handles `payment_success`** — missing order_shipped, delivered notifications
