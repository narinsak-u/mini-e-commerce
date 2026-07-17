# Phase 3: Categories Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full CRUD categories module with admin-only create/update/delete, public listing with pagination and search, and auto-slug generation.

**Architecture:** Drizzle schema → Domain entity (Category) with create/update methods → Repository interface → Application use cases (CreateCategory, UpdateCategory, DeleteCategory, ListCategories) → Drizzle repository → Controller → Routes. Auth and RBAC middleware protect admin endpoints. Zod validates inputs.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, Zod

---

### Task 1: Create categories Drizzle schema and update schema index

**Files:**
- Create: `backend/src/infrastructure/database/drizzle/schema/categories.ts`
- Modify: `backend/src/infrastructure/database/drizzle/schema/index.ts`

- [ ] **Step 1: Create categories table schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/categories.ts
import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Update schema index to export categories**

```typescript
// backend/src/infrastructure/database/drizzle/schema/index.ts
export { users } from "./users";
export { categories } from "./categories";
```

- [ ] **Step 3: Generate migration and apply**

Run: `cd backend && npx drizzle-kit generate`
Expected: Migration file created in `src/infrastructure/database/drizzle/migrations/` with categories table DDL.

Run: `cd backend && npx drizzle-kit migrate`
Expected: Categories table created in PostgreSQL.

Run: `docker compose exec postgres psql -U shopflow -d shopflow -c "\dt"`
Expected: Shows both `users` and `categories` tables.

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/drizzle/schema/categories.ts backend/src/infrastructure/database/drizzle/schema/index.ts backend/src/infrastructure/database/drizzle/migrations/
git commit -m "feat(backend): add categories Drizzle schema and migration"
```

---

### Task 2: Create Category domain entity and repository interface

**Files:**
- Create: `backend/src/domain/categories/entities/category.ts`
- Create: `backend/src/domain/categories/repositories/category-repository.ts`

- [ ] **Step 1: Create Category entity with create and update methods**

```typescript
// backend/src/domain/categories/entities/category.ts
/** Represents a product category. */
export interface Category {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Creates a new Category with default timestamps. */
export function createCategory(props: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}): Category {
  return {
    id: props.id,
    name: props.name,
    slug: props.slug,
    description: props.description ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Returns a new Category with updated fields and regenerated slug. */
export function updateCategory(
  category: Category,
  props: { name?: string; description?: string | null },
): Category {
  const slug = props.name ? slugify(props.name) : category.slug;
  return {
    id: category.id,
    name: props.name ?? category.name,
    slug,
    description: props.description !== undefined ? props.description : category.description,
    createdAt: category.createdAt,
    updatedAt: new Date(),
  };
}

/** Converts text to a URL-friendly slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
```

- [ ] **Step 2: Create ICategoryRepository interface**

```typescript
// backend/src/domain/categories/repositories/category-repository.ts
import type { Category } from "../entities/category";

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Repository interface for Category persistence. */
export interface ICategoryRepository {
  /** Finds a category by ID, returns null if not found. */
  findById(id: string): Promise<Category | null>;
  /** Finds a category by slug, returns null if not found. */
  findBySlug(slug: string): Promise<Category | null>;
  /** Returns a paginated list of categories with optional search. */
  findAll(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<PaginatedResult<Category>>;
  /** Saves a new category to the database. */
  save(category: Category): Promise<void>;
  /** Updates an existing category in the database. */
  update(category: Category): Promise<void>;
  /** Deletes a category by ID. */
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 3: Create directories and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\categories\entities" -Force
New-Item -ItemType Directory -Path "$root\domain\categories\repositories" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/categories/
git commit -m "feat(backend): add Category entity and repository interface"
```

---

### Task 3: Create category use cases

**Files:**
- Create: `backend/src/application/categories/use-cases/create-category.ts`
- Create: `backend/src/application/categories/use-cases/update-category.ts`
- Create: `backend/src/application/categories/use-cases/delete-category.ts`
- Create: `backend/src/application/categories/use-cases/list-categories.ts`

- [ ] **Step 1: Create CreateCategory use case**

```typescript
// backend/src/application/categories/use-cases/create-category.ts
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createCategory as buildCategory, slugify } from "../../../domain/categories/entities/category";
import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";
import { ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

/** Creates a use case that creates a new category. */
export function createCategory(categoryRepo: ICategoryRepository) {
  /** Executes category creation. @throws {ValidationError} if slug already exists. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const slug = slugify(data.name);

    const existing = await categoryRepo.findBySlug(slug);
    if (existing) throw new ValidationError("Category with this name already exists");

    const category = buildCategory({
      id: randomUUID(),
      name: data.name,
      slug,
      description: data.description,
    });

    await categoryRepo.save(category);
    return category;
  };
}
```

- [ ] **Step 2: Create UpdateCategory use case**

```typescript
// backend/src/application/categories/use-cases/update-category.ts
import { z } from "zod";
import { updateCategory as updateCategoryEntity } from "../../../domain/categories/entities/category";
import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
});

/** Creates a use case that updates an existing category. */
export function updateCategory(categoryRepo: ICategoryRepository) {
  /** Executes category update. @throws {NotFoundError} if category does not exist. @throws {ValidationError} if name conflicts. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const category = await categoryRepo.findById(data.id);
    if (!category) throw new NotFoundError("Category");

    const updated = updateCategoryEntity(category, {
      name: data.name,
      description: data.description,
    });

    const existingSlug = await categoryRepo.findBySlug(updated.slug);
    if (existingSlug && existingSlug.id !== category.id) {
      throw new ValidationError("Category with this name already exists");
    }

    await categoryRepo.update(updated);
    return updated;
  };
}
```

- [ ] **Step 3: Create DeleteCategory use case**

```typescript
// backend/src/application/categories/use-cases/delete-category.ts
import { z } from "zod";
import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  id: z.string().uuid(),
});

/** Creates a use case that deletes a category by ID. */
export function deleteCategory(categoryRepo: ICategoryRepository) {
  /** Executes category deletion. @throws {NotFoundError} if category does not exist. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const category = await categoryRepo.findById(data.id);
    if (!category) throw new NotFoundError("Category");

    await categoryRepo.delete(data.id);
  };
}
```

- [ ] **Step 4: Create ListCategories use case**

```typescript
// backend/src/application/categories/use-cases/list-categories.ts
import { z } from "zod";
import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";

const schema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(100),
  search: z.string().optional(),
});

/** Creates a use case that lists categories with pagination and search. */
export function listCategories(categoryRepo: ICategoryRepository) {
  /** Executes category listing. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    return categoryRepo.findAll(data);
  };
}
```

- [ ] **Step 5: Create use-cases directory and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\application\categories\use-cases" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/categories/use-cases/
git commit -m "feat(backend): add category use cases (CRUD + list)"
```

---

### Task 4: Create DrizzleCategoryRepository implementation

**Files:**
- Create: `backend/src/infrastructure/database/repositories/drizzle-category-repo.ts`

- [ ] **Step 1: Create DrizzleCategoryRepository**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-category-repo.ts
import { eq, like, desc, count } from "drizzle-orm";
import { db } from "../../../config/database";
import { categories } from "../drizzle/schema/categories";
import type { ICategoryRepository, PaginatedResult } from "../../../domain/categories/repositories/category-repository";
import type { Category } from "../../../domain/categories/entities/category";

/** Creates a Drizzle-backed category repository. */
export function createDrizzleCategoryRepo(): ICategoryRepository {
  return {
    async findById(id: string): Promise<Category | null> {
      const row = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
      if (!row[0]) return null;
      return rowToCategory(row[0]);
    },

    async findBySlug(slug: string): Promise<Category | null> {
      const row = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
      if (!row[0]) return null;
      return rowToCategory(row[0]);
    },

    async findAll(params: {
      page: number;
      limit: number;
      search?: string;
    }): Promise<PaginatedResult<Category>> {
      const { page, limit: limitVal, search } = params;
      const offset = (page - 1) * limitVal;

      const where = search ? like(categories.name, `%${search}%`) : undefined;

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(categories)
          .where(where)
          .orderBy(desc(categories.createdAt))
          .limit(limitVal)
          .offset(offset),
        db.select({ value: count() }).from(categories).where(where),
      ]);

      return {
        data: rows.map((r) => rowToCategory(r)),
        total: Number(totalResult[0].value),
        page,
        limit: limitVal,
      };
    },

    async save(category: Category): Promise<void> {
      await db.insert(categories).values({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      });
    },

    async update(category: Category): Promise<void> {
      await db
        .update(categories)
        .set({
          name: category.name,
          slug: category.slug,
          description: category.description,
          updatedAt: category.updatedAt,
        })
        .where(eq(categories.id, category.id));
    },

    async delete(id: string): Promise<void> {
      await db.delete(categories).where(eq(categories.id, id));
    },
  };
}

/** Converts a database row to a domain Category. */
function rowToCategory(row: typeof categories.$inferSelect): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/repositories/drizzle-category-repo.ts
git commit -m "feat(backend): add Drizzle category repository implementation"
```

---

### Task 5: Create Category controller and routes

**Files:**
- Create: `backend/src/presentation/controllers/category-controller.ts`
- Create: `backend/src/presentation/routes/categories.ts`

- [ ] **Step 1: Create CategoryController**

```typescript
// backend/src/presentation/controllers/category-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../../shared/errors/app-error";

/** Creates a category controller wired to the given use cases. */
export function createCategoryController(
  createCategory: (input: { name: string; description?: string }) => Promise<any>,
  updateCategory: (input: { id: string; name?: string; description?: string | null }) => Promise<any>,
  deleteCategory: (input: { id: string }) => Promise<void>,
  listCategories: (input: { page: number; limit: number; search?: string }) => Promise<any>,
) {
  return {
    /** Handles POST /categories. Creates a new category. @throws {ValidationError} on invalid input. */
    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await createCategory(req.body);
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        }
        next(err);
      }
    },

    /** Handles PATCH /categories/:id. Updates a category. @throws {ValidationError} on invalid input. */
    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await updateCategory({
          id: req.params.id,
          ...req.body,
        });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        }
        next(err);
      }
    },

    /** Handles DELETE /categories/:id. Deletes a category. */
    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        await deleteCategory({ id: req.params.id });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    /** Handles GET /categories. Lists categories with pagination and search. */
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const search = req.query.search as string | undefined;
        const result = await listCategories({ page, limit, search });
        res.json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
```

- [ ] **Step 2: Create category routes**

```typescript
// backend/src/presentation/routes/categories.ts
import { Router } from "express";
import { createDrizzleCategoryRepo } from "../../infrastructure/database/repositories/drizzle-category-repo";
import { createCategory } from "../../application/categories/use-cases/create-category";
import { updateCategory } from "../../application/categories/use-cases/update-category";
import { deleteCategory } from "../../application/categories/use-cases/delete-category";
import { listCategories } from "../../application/categories/use-cases/list-categories";
import { createCategoryController } from "../controllers/category-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

const categoryRepo = createDrizzleCategoryRepo();
const controller = createCategoryController(
  createCategory(categoryRepo),
  updateCategory(categoryRepo),
  deleteCategory(categoryRepo),
  listCategories(categoryRepo),
);

const router = Router();

router.get("/", controller.list);
router.post("/", authMiddleware, rbacMiddleware("admin"), controller.create);
router.patch("/:id", authMiddleware, rbacMiddleware("admin"), controller.update);
router.delete("/:id", authMiddleware, rbacMiddleware("admin"), controller.delete);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/category-controller.ts backend/src/presentation/routes/categories.ts
git commit -m "feat(backend): add category controller and routes"
```

---

### Task 6: Wire category routes into the Express app

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update index.ts to mount category routes**

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

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 2: Start server and verify category endpoints**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3000.

Run: `curl http://localhost:3000/categories`
Expected: `{ "data": [], "total": 0, "page": 1, "limit": 10 }`

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/index.ts
git commit -m "feat(backend): wire category routes into Express app"
```

---

### Task 7: Write categories integration tests

**Files:**
- Create: `backend/src/tests/categories.test.ts`

- [ ] **Step 1: Create categories test file**

```typescript
// backend/src/tests/categories.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { users, categories } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";

const adminEmail = `admin-${randomUUID()}@example.com`;
const adminPassword = "password123";
let adminToken = "";
let categoryId = "";

beforeAll(async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ name: "Admin", email: adminEmail, password: adminPassword });
  adminToken = res.body.accessToken;

  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, adminEmail));
});

afterAll(async () => {
  await db.delete(categories);
  await db.delete(users).where(eq(users.email, adminEmail));
});

describe("Categories API", () => {
  it("lists categories when empty", async () => {
    const res = await request(app).get("/categories");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it("creates a category as admin", async () => {
    const res = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Electronics" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Electronics");
    expect(res.body.slug).toBe("electronics");
    expect(res.body.description).toBeNull();
    categoryId = res.body.id;
  });

  it("rejects create without auth header", async () => {
    const res = await request(app)
      .post("/categories")
      .send({ name: "Books" });
    expect(res.status).toBe(401);
  });

  it("rejects create as customer role", async () => {
    const custEmail = `cust-${randomUUID()}@example.com`;
    const custRes = await request(app)
      .post("/auth/register")
      .send({ name: "Customer", email: custEmail, password: "password123" });
    const customerToken = custRes.body.accessToken;

    const res = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Books" });
    expect(res.status).toBe(403);

    await db.delete(users).where(eq(users.email, custEmail));
  });

  it("lists categories with data and pagination", async () => {
    const res = await request(app).get("/categories");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it("searches categories by name", async () => {
    const res = await request(app).get("/categories?search=Elect");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);

    const empty = await request(app).get("/categories?search=Books");
    expect(empty.status).toBe(200);
    expect(empty.body.data.length).toBe(0);
  });

  it("updates a category as admin", async () => {
    const res = await request(app)
      .patch(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Electronics Gadgets", description: "All things electronic" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Electronics Gadgets");
    expect(res.body.slug).toBe("electronics-gadgets");
    expect(res.body.description).toBe("All things electronic");
  });

  it("rejects duplicate category name on update", async () => {
    // Create a second category
    const second = await request(app)
      .post("/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Books" });

    // Try to rename first to "Books"
    const res = await request(app)
      .patch(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Books" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Category with this name already exists");

    // Clean up second category
    await db.delete(categories).where(eq(categories.id, second.body.id));
  });

  it("deletes a category as admin", async () => {
    const res = await request(app)
      .delete(`/categories/${categoryId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it("returns 404 when deleting non-existent category", async () => {
    const res = await request(app)
      .delete(`/categories/${randomUUID()}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("rejects update with invalid UUID", async () => {
    const res = await request(app)
      .patch("/categories/not-a-uuid")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Test" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass (health, database, auth, and categories tests).

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/categories.test.ts
git commit -m "feat(backend): add categories integration tests"
```

---

## Acceptance Criteria
- [ ] GET /categories returns paginated list with search support
- [ ] POST /categories creates category with auto-slug (admin only)
- [ ] PATCH /categories/:id updates category fields and regenerates slug (admin only)
- [ ] DELETE /categories/:id removes category (admin only)
- [ ] Unauthenticated requests to admin endpoints return 401
- [ ] Customer role requests to admin endpoints return 403
- [ ] Duplicate category names return 400 with descriptive error
- [ ] Non-existent category IDs return 404
- [ ] Invalid UUIDs in route params return 400
- [ ] All 12 integration tests pass

## Test Plan
- **Integration (supertest):** Empty list, create as admin, RBAC enforcement (no auth, customer role), list with data, search filtering, update fields, duplicate name on update, delete, 404 on missing delete, invalid UUID rejection
