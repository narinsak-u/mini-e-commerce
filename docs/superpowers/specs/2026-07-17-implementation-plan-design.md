# Implementation Plan Design — ShopFlow Mini E-Commerce

## Overview

This document defines the structure and approach for the detailed implementation plan of the ShopFlow mini e-commerce project. The master design lives in `docs/PLAN.md`. This document describes how we decompose that plan into executable phase-level implementation plans.

## Approach

- **One file per phase**, stored under `docs/superpowers/plans/`
- Named `phase-01-bootstrap.md` through `phase-13-production-hardening.md`
- Each file is self-contained: dependencies, file list, step-by-step tasks, acceptance criteria, test plan
- Sequential ordering matches the 13 phases in `docs/PLAN.md`
- AGENTS.md rule "tests before next phase" enforces the gate between phases

## Phase File Template

Every phase file follows this structure:

```
# Phase N: [Name]

## Goal
One-line summary of what this phase delivers.

## Dependencies
What must be completed before starting.

## Files to Create
Organized by Clean Architecture layer:
- src/domain/...
- src/application/...
- src/infrastructure/...
- src/presentation/...

## Step-by-Step Tasks
Each task is one self-contained step:

### Task N.1 — [Short Name]
**What:** Description of what to build
**Files:** List of files affected
**Details:** Implementation notes, interfaces, signatures, patterns
**Check:** How to verify it works

## Acceptance Criteria
Checklist of deliverables that must be met.

## Test Plan
What to test and how (unit + integration).
```

## Phase Overview

| # | Phase | Key Deliverables |
|---|-------|-----------------|
| 1 | Bootstrap | Express + TS + Docker + PostgreSQL + Drizzle + Redis + RabbitMQ, health check |
| 2 | Authentication | JWT register/login/refresh/logout, RBAC middleware |
| 3 | Categories | CRUD + validation |
| 4 | Products | CRUD + search + pagination + filtering |
| 5 | Redis Integration | Product/category/session/rate-limit caching |
| 6 | Shopping Cart | Redis-based cart with add/remove/update/clear |
| 7 | Checkout | Create order + publish RabbitMQ event |
| 8 | Inventory Worker | Consume order event, reduce stock, log inventory |
| 9 | Payment Worker | Mock payment, update order, publish success event |
| 10 | Notification Worker | Email + in-app notification |
| 11 | Analytics Worker | Revenue, best sellers, dashboard stats |
| 12 | Admin Dashboard | Products, orders, revenue, inventory views |
| 13 | Production Hardening | Retry, DLQ, idempotent consumers, optimistic locking, logging, monitoring |

## File Organization

```
docs/superpowers/plans/
├── phase-01-bootstrap.md
├── phase-02-auth.md
├── phase-03-categories.md
├── phase-04-products.md
├── phase-05-redis-integration.md
├── phase-06-cart.md
├── phase-07-checkout.md
├── phase-08-inventory-worker.md
├── phase-09-payment-worker.md
├── phase-10-notification-worker.md
├── phase-11-analytics-worker.md
├── phase-12-admin-dashboard.md
└── phase-13-production-hardening.md
```

## Constraints

- Every file task must respect Clean Architecture: domain → application → infrastructure → presentation
- Use cases are one per file
- Repository interfaces in domain, implementations in infrastructure
- Dependency injection via constructor injection
- Tests required before advancing to next phase
