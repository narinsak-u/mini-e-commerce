# Phase 1: Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the backend project with Express.js, TypeScript, Docker (PostgreSQL, Redis, RabbitMQ), Drizzle ORM, and a health check endpoint.

**Architecture:** Clean Architecture scaffolding — domain/application/infrastructure/presentation directories with module-per-feature structure. Docker Compose for local infrastructure. Drizzle for schema and migrations.

**Tech Stack:** Express.js, TypeScript, PostgreSQL, Drizzle ORM, Redis, RabbitMQ, Docker

---

### Task 1: Initialize backend project with TypeScript and dependencies

**Files:**
- Create: `backend/package.json`
- Modify: `backend/package.json` (update existing)
- Create: `backend/tsconfig.json`

- [ ] **Step 1: Update package.json**

```json
{
  "name": "@shopflow/backend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "express": "^5.1.0",
    "@types/express": "^5.0.0",
    "dotenv": "^16.4.0",
    "drizzle-orm": "^0.40.0",
    "postgres": "^3.4.0",
    "ioredis": "^5.5.0",
    "amqplib": "^0.10.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.24.0",
    "cors": "^2.8.5",
    "helmet": "^8.0.0",
    "compression": "^1.8.0",
    "express-rate-limit": "^7.5.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "@types/node": "^22.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.0",
    "@types/amqplib": "^0.10.0",
    "@types/cors": "^2.8.0",
    "@types/compression": "^1.7.0",
    "drizzle-kit": "^0.30.0",
    "vitest": "^3.0.0",
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create .env file**

```
NODE_ENV=development
PORT=3000

DATABASE_URL=postgres://shopflow:shopflow@localhost:5432/shopflow
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672

JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

- [ ] **Step 4: Install dependencies**

Run: `cd backend && npm install`
Expected: All dependencies installed, node_modules/ created.

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 6: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/package.json backend/tsconfig.json backend/.gitignore
git commit -m "feat(backend): init TypeScript project with Express and dependencies"
```

---

### Task 2: Set up Docker Compose with PostgreSQL, Redis, RabbitMQ

**Files:**
- Create: `docker-compose.yml` (project root)
- Create: `backend/Dockerfile`

- [ ] **Step 1: Create docker-compose.yml at project root**

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: shopflow
      POSTGRES_PASSWORD: shopflow
      POSTGRES_DB: shopflow
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  rabbitmq:
    image: rabbitmq:4-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq

volumes:
  postgres-data:
  redis-data:
  rabbitmq-data:
```

- [ ] **Step 2: Create backend/Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 3: Start infrastructure**

Run: `cd D:\Github\mini-e-commerce && docker compose up -d`
Expected: Three containers running (postgres, redis, rabbitmq).

- [ ] **Step 4: Verify services are running**

Run: `docker compose ps`
Expected: All three services show "Up" status.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml backend/Dockerfile
git commit -m "feat: add Docker Compose with PostgreSQL, Redis, RabbitMQ"
```

---

### Task 3: Create project directory structure and config module

**Files:**
- Create: `backend/src/index.ts` (entry point)
- Create: `backend/src/config/env.ts`
- Create: `backend/src/config/database.ts`
- Create: `backend/src/config/redis.ts`
- Create: `backend/src/config/rabbitmq.ts`
- Create: `backend/src/shared/errors/app-error.ts`
- Create: `backend/src/shared/types/index.ts`

- [ ] **Step 1: Create directory structure**

Run:
```powershell
$root = "D:\Github\mini-e-commerce\backend\src"
$dirs = @(
  "config",
  "domain\auth",
  "domain\categories",
  "domain\products",
  "domain\cart",
  "domain\orders",
  "domain\payments",
  "domain\inventory",
  "domain\notifications",
  "application\auth\use-cases",
  "application\auth\interfaces",
  "application\categories\use-cases",
  "application\products\use-cases",
  "application\cart\use-cases",
  "application\orders\use-cases",
  "application\payments\use-cases",
  "application\inventory\use-cases",
  "application\notifications\use-cases",
  "infrastructure\database\drizzle\schema",
  "infrastructure\database\drizzle\migrations",
  "infrastructure\database\repositories",
  "infrastructure\redis",
  "infrastructure\rabbitmq\consumers",
  "infrastructure\auth",
  "infrastructure\workers",
  "presentation\middleware",
  "presentation\routes",
  "presentation\controllers",
  "shared\errors",
  "shared\types"
)
foreach ($d in $dirs) { New-Item -ItemType Directory -Path "$root\$d" -Force }
```

- [ ] **Step 2: Create config/env.ts**

```typescript
import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || "postgres://shopflow:shopflow@localhost:5432/shopflow",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  rabbitmqUrl: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
} as const;
```

- [ ] **Step 3: Create config/database.ts**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";
import * as schema from "../infrastructure/database/drizzle/schema";

const queryClient = postgres(env.databaseUrl);
export const db = drizzle(queryClient, { schema });
export type Db = typeof db;
```

- [ ] **Step 4: Create config/redis.ts**

```typescript
import Redis from "ioredis";
import { env } from "./env";

export const redis = new Redis(env.redisUrl);
```

- [ ] **Step 5: Create config/rabbitmq.ts**

```typescript
import amqp from "amqplib";
import { env } from "./env";

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export async function getRabbitChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();
  await channel.assertExchange("shop.exchange", "topic", { durable: true });
  return channel;
}

export async function closeRabbit(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
```

- [ ] **Step 6: Create shared/errors/app-error.ts**

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(403, message, "FORBIDDEN");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
  }
}
```

- [ ] **Step 7: Create shared/types/index.ts**

```typescript
export type Role = "customer" | "admin";

export type OrderStatus =
  | "pending"
  | "paid"
  | "packing"
  | "shipping"
  | "completed"
  | "cancelled";
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/
git commit -m "feat(backend): add project structure, config module, shared types"
```

---

### Task 4: Set up Drizzle ORM with initial schema

**Files:**
- Create: `backend/src/infrastructure/database/drizzle/schema/index.ts`
- Create: `backend/src/infrastructure/database/drizzle/schema/users.ts`
- Create: `backend/drizzle.config.ts`

- [ ] **Step 1: Create drizzle.config.ts**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/database/drizzle/schema/*.ts",
  out: "./src/infrastructure/database/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create schema/index.ts**

```typescript
export { users } from "./users";
```

- [ ] **Step 3: Create schema/users.ts**

```typescript
import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["customer", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum("role").default("customer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 4: Generate initial migration**

Run: `cd backend && npx drizzle-kit generate`
Expected: Migration files created in `src/infrastructure/database/drizzle/migrations/`.

- [ ] **Step 5: Run migration**

Run: `cd backend && npx drizzle-kit migrate`
Expected: Tables created in PostgreSQL.

- [ ] **Step 6: Verify tables exist**

Run: `docker compose exec postgres psql -U shopflow -d shopflow -c "\dt"`
Expected: Shows `users` table.

- [ ] **Step 7: Commit**

```bash
git add backend/drizzle.config.ts backend/src/infrastructure/database/drizzle/
git commit -m "feat(backend): add Drizzle ORM with users schema and migration"
```

---

### Task 5: Create Express server with error handling middleware

**Files:**
- Modify: `backend/src/index.ts`
- Create: `backend/src/presentation/middleware/error-handler.ts`

- [ ] **Step 1: Create error handler middleware**

```typescript
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../shared/errors/app-error";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error" },
  });
}
```

- [ ] **Step 2: Create Express server entry point**

```typescript
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config/env";
import { errorHandler } from "./presentation/middleware/error-handler";

const app = express();

app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(compression());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 3: Start server**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3000 with "Server running on port 3000" logged.

- [ ] **Step 4: Verify health endpoint**

Run: `curl http://localhost:3000/health`
Expected: `{ "status": "ok", "timestamp": "..." }`

- [ ] **Step 5: Commit**

```bash
git add backend/src/index.ts backend/src/presentation/middleware/error-handler.ts
git commit -m "feat(backend): add Express server with health check and error middleware"
```

---

### Task 6: Set up Vitest and write bootstrap tests

**Files:**
- Create: `backend/vitest.config.ts`
- Create: `backend/src/tests/health.test.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 2: Write health endpoint test**

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../index";

describe("Health Check", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
```

- [ ] **Step 3: Install supertest**

Run: `cd backend && npm install -D supertest @types/supertest`

- [ ] **Step 4: Run tests**

Run: `cd backend && npm test`
Expected: Tests pass (1 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/vitest.config.ts backend/src/tests/health.test.ts backend/package.json
git commit -m "feat(backend): add Vitest setup with health check test"
```

---

### Task 7: Add database connection test and verify Drizzle works

**Files:**
- Create: `backend/src/tests/database.test.ts`

- [ ] **Step 1: Write database connection test**

```typescript
import { describe, it, expect } from "vitest";
import { db } from "../config/database";
import { sql } from "drizzle-orm";

describe("Database", () => {
  it("connects and runs a query", async () => {
    const result = await db.execute(sql`SELECT 1 as value`);
    expect(result).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: Both tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/tests/database.test.ts
git commit -m "feat(backend): add database connection test"
```

---

## Acceptance Criteria

- [ ] `npm run dev` starts the server on port 3000
- [ ] `GET /health` returns `{ status: "ok" }`
- [ ] Docker Compose runs PostgreSQL, Redis, RabbitMQ
- [ ] Drizzle generates and runs migrations
- [ ] Users table exists in PostgreSQL
- [ ] `npm test` passes all tests
- [ ] Error handler returns structured JSON errors
- [ ] Existing frontend still runs with `npm run dev` from `frontend/`

## Test Plan

- **Unit:** Health endpoint returns correct shape
- **Integration:** Database connection works
- **Manual:** Docker services up, curl health endpoint, verify migration ran
