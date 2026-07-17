# AGENTS.md

## Project State

Early stage. `frontend/` is a fresh Vite + React 19 + TypeScript 6 template. `backend/` is an empty shell (package.json, no deps or source). No commits yet. Architecture plan lives in `docs/PLAN.md`.

## Structure

Two separate packages, no monorepo tooling:

- `frontend/` — Vite 8, React 19, TypeScript 6, ESLint
- `backend/` — Express.js + TypeScript (planned, not yet built)
- `docs/PLAN.md` — full architecture spec (Clean Architecture, modules, DB schema, workers)

## Commands

All commands run from the package directory:

```bash
# Frontend
cd frontend
npm run dev       # Vite dev server
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # preview production build

# Backend
cd backend
# No commands yet — package is empty
```

## Architecture Rules (from PLAN.md)

When building backend, enforce these constraints:

- **Clean Architecture**: `src/domain` → `src/application` → `src/infrastructure` → `src/presentation`. Domain never depends on infra.
- **Module-per-feature**: Each module (auth, products, cart, orders, etc.) owns its own entity, repository, use cases, controller, routes.
- **Dependency Injection**: Interfaces in domain/application, implementations in infrastructure. Never import infrastructure from domain.
- **One use case per file** — keep them small and composable.
- **Tests before moving to next phase**.

## Tech Stack (planned)

PostgreSQL + Drizzle ORM, Redis, RabbitMQ, JWT auth, Docker. See `docs/PLAN.md` for full spec.
