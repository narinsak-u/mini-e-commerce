# Phase 4: Products Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full CRUD products module with admin-only create/update/delete, public listing with pagination/search/filter/sort, and soft delete.

**Architecture:** Drizzle schema → Domain entity (Product) with factory methods → Repository interface (IProductRepository) with paginated findMany → Application use cases (CreateProduct, UpdateProduct, DeleteProduct, GetProduct, ListProducts) → Drizzle repository with search/filter/sort queries → Controller → Routes. Auth and RBAC middleware protect admin endpoints. Zod validates inputs.

**Tech Stack:** Express.js, TypeScript, Drizzle ORM, PostgreSQL, Zod

---

### Task 1: Create products Drizzle schema and update schema index

**Files:**
- Create: `backend/src/infrastructure/database/drizzle/schema/products.ts`
- Modify: `backend/src/infrastructure/database/drizzle/schema/index.ts`

- [ ] **Step 1: Create products table schema**

```typescript
// backend/src/infrastructure/database/drizzle/schema/products.ts
import { pgTable, uuid, varchar, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { categories } from "./categories";

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  imageUrl: varchar("image_url", { length: 500 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Update schema index to export products**

```typescript
// backend/src/infrastructure/database/drizzle/schema/index.ts
export { users, roleEnum } from "./users";
export { categories } from "./categories";
export { products } from "./products";
```

- [ ] **Step 3: Generate migration and apply**

Run: `cd backend && npx drizzle-kit generate`
Expected: Migration file created in `src/infrastructure/database/drizzle/migrations/` with products table DDL.

Run: `cd backend && npx drizzle-kit migrate`
Expected: Products table created in PostgreSQL.

Run: `docker compose exec postgres psql -U shopflow -d shopflow -c "\dt"`
Expected: Shows `users`, `categories`, and `products` tables.

- [ ] **Step 4: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/drizzle/schema/products.ts backend/src/infrastructure/database/drizzle/schema/index.ts backend/src/infrastructure/database/drizzle/migrations/
git commit -m "feat(backend): add products Drizzle schema and migration"
```

---

### Task 2: Create Product domain entity and repository interface

**Files:**
- Create: `backend/src/domain/products/entities/product.ts`
- Create: `backend/src/domain/products/repositories/product-repository.ts`

- [ ] **Step 1: Create Product entity with create and update methods**

```typescript
// backend/src/domain/products/entities/product.ts
/** Represents a product in the catalog. */
export interface Product {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly price: string;
  readonly stock: number;
  readonly categoryId: string | null;
  readonly imageUrl: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Creates a new Product with default values. */
export function createProduct(props: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  price: string;
  stock?: number;
  categoryId?: string | null;
  imageUrl?: string | null;
}): Product {
  return {
    id: props.id,
    name: props.name,
    slug: props.slug,
    description: props.description ?? null,
    price: props.price,
    stock: props.stock ?? 0,
    categoryId: props.categoryId ?? null,
    imageUrl: props.imageUrl ?? null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Returns a new Product with updated fields. */
export function updateProduct(
  product: Product,
  props: {
    name?: string;
    slug?: string;
    description?: string | null;
    price?: string;
    stock?: number;
    categoryId?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
  },
): Product {
  return {
    id: product.id,
    name: props.name ?? product.name,
    slug: props.slug ?? product.slug,
    description: props.description !== undefined ? props.description : product.description,
    price: props.price ?? product.price,
    stock: props.stock ?? product.stock,
    categoryId: props.categoryId !== undefined ? props.categoryId : product.categoryId,
    imageUrl: props.imageUrl !== undefined ? props.imageUrl : product.imageUrl,
    isActive: props.isActive ?? product.isActive,
    createdAt: product.createdAt,
    updatedAt: new Date(),
  };
}

/** Returns a new Product with isActive set to false. */
export function deactivateProduct(product: Product): Product {
  return updateProduct(product, { isActive: false });
}
```

- [ ] **Step 2: Create IProductRepository interface**

```typescript
// backend/src/domain/products/repositories/product-repository.ts
import type { Product } from "../entities/product";

/** Paginated result wrapper. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Filters for product listing with pagination, search, category filter, and sort options. */
export interface ProductFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  sortBy?: "price" | "createdAt";
  sortOrder?: "asc" | "desc";
}

/** Repository interface for Product persistence. */
export interface IProductRepository {
  /** Finds a product by ID (including inactive), returns null if not found. */
  findById(id: string): Promise<Product | null>;
  /** Finds a product by slug, returns null if not found. */
  findBySlug(slug: string): Promise<Product | null>;
  /** Returns a paginated list of active products with search, category filter, and sort. */
  findMany(filters: ProductFilters): Promise<PaginatedResult<Product>>;
  /** Saves a new product to the database. */
  save(product: Product): Promise<void>;
  /** Updates an existing product in the database. */
  update(product: Product): Promise<void>;
  /** Soft-deletes a product by ID (sets isActive=false). */
  delete(id: string): Promise<void>;
}
```

- [ ] **Step 3: Create directories and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\domain\products\entities" -Force
New-Item -ItemType Directory -Path "$root\domain\products\repositories" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/domain/products/
git commit -m "feat(backend): add Product entity and repository interface"
```

---

### Task 3: Create product use cases

**Files:**
- Create: `backend/src/application/products/use-cases/create-product.ts`
- Create: `backend/src/application/products/use-cases/update-product.ts`
- Create: `backend/src/application/products/use-cases/delete-product.ts`
- Create: `backend/src/application/products/use-cases/get-product.ts`
- Create: `backend/src/application/products/use-cases/list-products.ts`

- [ ] **Step 1: Create CreateProduct use case**

```typescript
// backend/src/application/products/use-cases/create-product.ts
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createProduct as buildProduct } from "../../../domain/products/entities/product";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid price format"),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().max(500).optional(),
});

/** Converts text to a URL-friendly slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/** Creates a use case that creates a new product. */
export function createProduct(productRepo: IProductRepository) {
  /** Executes product creation. @throws {ValidationError} if slug already exists. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const slug = slugify(data.name);

    const existing = await productRepo.findBySlug(slug);
    if (existing) throw new ValidationError("Product with this slug already exists");

    const product = buildProduct({
      id: randomUUID(),
      name: data.name,
      slug,
      description: data.description,
      price: data.price,
      stock: data.stock,
      categoryId: data.categoryId,
      imageUrl: data.imageUrl,
    });

    await productRepo.save(product);
    return product;
  };
}
```

- [ ] **Step 2: Create UpdateProduct use case**

```typescript
// backend/src/application/products/use-cases/update-product.ts
import { z } from "zod";
import { slugify } from "./create-product";
import { updateProduct as updateProductEntity } from "../../../domain/products/entities/product";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { NotFoundError, ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  imageUrl: z.string().url().max(500).optional().nullable(),
});

/** Creates a use case that updates an existing product. */
export function updateProduct(productRepo: IProductRepository) {
  /** Executes product update. @throws {NotFoundError} if product does not exist. @throws {ValidationError} if slug conflicts. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const product = await productRepo.findById(data.id);
    if (!product) throw new NotFoundError("Product");

    let slug = product.slug;
    if (data.name) {
      slug = slugify(data.name);
      const existing = await productRepo.findBySlug(slug);
      if (existing && existing.id !== product.id) {
        throw new ValidationError("Product with this name already exists");
      }
    }

    const updated = updateProductEntity(product, { ...data, slug });
    await productRepo.update(updated);
    return updated;
  };
}
```

- [ ] **Step 3: Create DeleteProduct use case (soft delete)**

```typescript
// backend/src/application/products/use-cases/delete-product.ts
import { z } from "zod";
import { deactivateProduct } from "../../../domain/products/entities/product";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  id: z.string().uuid(),
});

/** Creates a use case that soft-deletes a product by ID. */
export function deleteProduct(productRepo: IProductRepository) {
  /** Executes product soft delete. @throws {NotFoundError} if product does not exist. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const product = await productRepo.findById(data.id);
    if (!product) throw new NotFoundError("Product");

    const deactivated = deactivateProduct(product);
    await productRepo.update(deactivated);
  };
}
```

- [ ] **Step 4: Create GetProduct use case**

```typescript
// backend/src/application/products/use-cases/get-product.ts
import { z } from "zod";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  id: z.string().uuid(),
});

/** Creates a use case that retrieves a single active product. */
export function getProduct(productRepo: IProductRepository) {
  /** Executes product retrieval. @throws {NotFoundError} if product does not exist or is inactive. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const product = await productRepo.findById(data.id);
    if (!product || !product.isActive) throw new NotFoundError("Product");

    return product;
  };
}
```

- [ ] **Step 5: Create ListProducts use case**

```typescript
// backend/src/application/products/use-cases/list-products.ts
import { z } from "zod";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";

const schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z.enum(["price", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/** Creates a use case that lists products with pagination, search, filter, and sort. */
export function listProducts(productRepo: IProductRepository) {
  /** Executes product listing. */
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    return productRepo.findMany(data);
  };
}
```

- [ ] **Step 6: Create use-cases directory and commit**

```bash
$root = "D:\Github\mini-e-commerce\backend\src"
New-Item -ItemType Directory -Path "$root\application\products\use-cases" -Force
```

```bash
cd D:\Github\mini-e-commerce
git add backend/src/application/products/use-cases/
git commit -m "feat(backend): add product use cases (CRUD + list with search/filter/sort)"
```

---

### Task 4: Create DrizzleProductRepository implementation

**Files:**
- Create: `backend/src/infrastructure/database/repositories/drizzle-product-repo.ts`

- [ ] **Step 1: Create DrizzleProductRepository**

```typescript
// backend/src/infrastructure/database/repositories/drizzle-product-repo.ts
import { eq, like, and, desc, asc, count, sql } from "drizzle-orm";
import { db } from "../../../config/database";
import { products } from "../drizzle/schema/products";
import type { IProductRepository, ProductFilters, PaginatedResult } from "../../../domain/products/repositories/product-repository";
import type { Product } from "../../../domain/products/entities/product";

/** Creates a Drizzle-backed product repository. */
export function createDrizzleProductRepo(): IProductRepository {
  return {
    async findById(id: string): Promise<Product | null> {
      const row = await db.select().from(products).where(eq(products.id, id)).limit(1);
      if (!row[0]) return null;
      return rowToProduct(row[0]);
    },

    async findBySlug(slug: string): Promise<Product | null> {
      const row = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
      if (!row[0]) return null;
      return rowToProduct(row[0]);
    },

    async findMany(filters: ProductFilters): Promise<PaginatedResult<Product>> {
      const { page, limit, search, categoryId, sortBy, sortOrder } = filters;
      const offset = (page - 1) * limit;

      const conditions = [eq(products.isActive, true)];

      if (search) {
        conditions.push(
          sql`(${like(products.name, `%${search}%`)} OR ${like(products.description, `%${search}%`)})`,
        );
      }

      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId));
      }

      const where = and(...conditions);

      const orderBy = sortBy === "price"
        ? (sortOrder === "desc" ? desc(products.price) : asc(products.price))
        : (sortOrder === "asc" ? asc(products.createdAt) : desc(products.createdAt));

      const [rows, totalResult] = await Promise.all([
        db
          .select()
          .from(products)
          .where(where)
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        db.select({ value: count() }).from(products).where(where),
      ]);

      return {
        data: rows.map((r) => rowToProduct(r)),
        total: Number(totalResult[0].value),
        page,
        limit,
      };
    },

    async save(product: Product): Promise<void> {
      await db.insert(products).values({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price,
        stock: product.stock,
        categoryId: product.categoryId,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      });
    },

    async update(product: Product): Promise<void> {
      await db
        .update(products)
        .set({
          name: product.name,
          slug: product.slug,
          description: product.description,
          price: product.price,
          stock: product.stock,
          categoryId: product.categoryId,
          imageUrl: product.imageUrl,
          isActive: product.isActive,
          updatedAt: product.updatedAt,
        })
        .where(eq(products.id, product.id));
    },

    async delete(id: string): Promise<void> {
      // ponytail: soft delete via isActive=false, hard delete stays for admin if needed later
      await db
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, id));
    },
  };
}

/** Converts a database row to a domain Product. */
function rowToProduct(row: typeof products.$inferSelect): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    stock: row.stock,
    categoryId: row.categoryId,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/infrastructure/database/repositories/drizzle-product-repo.ts
git commit -m "feat(backend): add Drizzle product repository implementation"
```

---

### Task 5: Create Product controller and routes

**Files:**
- Create: `backend/src/presentation/controllers/product-controller.ts`
- Create: `backend/src/presentation/routes/products.ts`

- [ ] **Step 1: Create ProductController**

```typescript
// backend/src/presentation/controllers/product-controller.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ValidationError } from "../../shared/errors/app-error";

/** Creates a product controller wired to the given use cases. */
export function createProductController(
  createProduct: (input: { name: string; price: string; description?: string; stock?: number; categoryId?: string; imageUrl?: string }) => Promise<any>,
  updateProduct: (input: { id: string; name?: string; price?: string; description?: string | null; stock?: number; categoryId?: string | null; imageUrl?: string | null }) => Promise<any>,
  deleteProduct: (input: { id: string }) => Promise<void>,
  getProduct: (input: { id: string }) => Promise<any>,
  listProducts: (input: { page: number; limit: number; search?: string; categoryId?: string; sortBy?: string; sortOrder?: string }) => Promise<any>,
) {
  return {
    /** Handles POST /products. Creates a new product. @throws {ValidationError} on invalid input. */
    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await createProduct(req.body);
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        }
        next(err);
      }
    },

    /** Handles PATCH /products/:id. Updates a product. @throws {ValidationError} on invalid input. */
    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await updateProduct({
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

    /** Handles DELETE /products/:id. Soft-deletes a product. */
    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        await deleteProduct({ id: req.params.id });
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },

    /** Handles GET /products/:id. Gets a single active product. @throws {NotFoundError} if not found or inactive. */
    async get(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await getProduct({ id: req.params.id });
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        }
        next(err);
      }
    },

    /** Handles GET /products. Lists products with pagination, search, filter, and sort. */
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await listProducts(req.query);
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) {
          return next(new ValidationError(err.errors.map((e) => e.message).join(", ")));
        }
        next(err);
      }
    },
  };
}
```

- [ ] **Step 2: Create product routes**

```typescript
// backend/src/presentation/routes/products.ts
import { Router } from "express";
import { createDrizzleProductRepo } from "../../infrastructure/database/repositories/drizzle-product-repo";
import { createProduct } from "../../application/products/use-cases/create-product";
import { updateProduct } from "../../application/products/use-cases/update-product";
import { deleteProduct } from "../../application/products/use-cases/delete-product";
import { getProduct } from "../../application/products/use-cases/get-product";
import { listProducts } from "../../application/products/use-cases/list-products";
import { createProductController } from "../controllers/product-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

const productRepo = createDrizzleProductRepo();
const controller = createProductController(
  createProduct(productRepo),
  updateProduct(productRepo),
  deleteProduct(productRepo),
  getProduct(productRepo),
  listProducts(productRepo),
);

const router = Router();

router.get("/", controller.list);
router.get("/:id", controller.get);
router.post("/", authMiddleware, rbacMiddleware("admin"), controller.create);
router.patch("/:id", authMiddleware, rbacMiddleware("admin"), controller.update);
router.delete("/:id", authMiddleware, rbacMiddleware("admin"), controller.delete);

export default router;
```

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/presentation/controllers/product-controller.ts backend/src/presentation/routes/products.ts
git commit -m "feat(backend): add product controller and routes"
```

---

### Task 6: Wire product routes into the Express app

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update index.ts to mount product routes**

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

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});

export default app;
```

- [ ] **Step 2: Start server and verify product endpoints**

Run: `cd backend && npm run dev`
Expected: Server starts on port 3000.

Run: `curl http://localhost:3000/products`
Expected: `{ "data": [], "total": 0, "page": 1, "limit": 10 }`

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/index.ts
git commit -m "feat(backend): wire product routes into Express app"
```

---

### Task 7: Write products integration tests

**Files:**
- Create: `backend/src/tests/products.test.ts`

- [ ] **Step 1: Create products test file**

```typescript
// backend/src/tests/products.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../index";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { users, categories, products } from "../infrastructure/database/drizzle/schema";
import { randomUUID } from "node:crypto";

const adminEmail = `admin-${randomUUID()}@example.com`;
const adminPassword = "password123";
let adminToken = "";
let categoryId = "";
let productId = "";

beforeAll(async () => {
  const res = await request(app)
    .post("/auth/register")
    .send({ name: "Admin", email: adminEmail, password: adminPassword });
  adminToken = res.body.accessToken;

  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.email, adminEmail));

  const catRes = await request(app)
    .post("/categories")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Electronics" });
  categoryId = catRes.body.id;
});

afterAll(async () => {
  await db.delete(products);
  await db.delete(categories);
  await db.delete(users).where(eq(users.email, adminEmail));
});

describe("Products API", () => {
  it("lists products when empty", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it("creates a product as admin", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Gaming Mouse",
        price: "49.99",
        stock: 100,
        categoryId,
        description: "A high-quality gaming mouse",
        imageUrl: "https://example.com/mouse.jpg",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Gaming Mouse");
    expect(res.body.slug).toBe("gaming-mouse");
    expect(res.body.price).toBe("49.99");
    expect(res.body.stock).toBe(100);
    expect(res.body.categoryId).toBe(categoryId);
    expect(res.body.isActive).toBe(true);
    productId = res.body.id;
  });

  it("rejects create without auth header", async () => {
    const res = await request(app)
      .post("/products")
      .send({ name: "Keyboard", price: "99.99" });
    expect(res.status).toBe(401);
  });

  it("rejects create as customer role", async () => {
    const custEmail = `cust-${randomUUID()}@example.com`;
    const custRes = await request(app)
      .post("/auth/register")
      .send({ name: "Customer", email: custEmail, password: "password123" });
    const customerToken = custRes.body.accessToken;

    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Keyboard", price: "99.99" });
    expect(res.status).toBe(403);

    await db.delete(users).where(eq(users.email, custEmail));
  });

  it("gets a product by id", async () => {
    const res = await request(app).get(`/products/${productId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Gaming Mouse");
    expect(res.body.price).toBe("49.99");
  });

  it("returns 404 for non-existent product", async () => {
    const res = await request(app).get(`/products/${randomUUID()}`);
    expect(res.status).toBe(404);
  });

  it("lists products with data and pagination", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it("searches products by name", async () => {
    const res = await request(app).get("/products?search=Gaming");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);

    const empty = await request(app).get("/products?search=Keyboard");
    expect(empty.status).toBe(200);
    expect(empty.body.data.length).toBe(0);
  });

  it("filters products by category", async () => {
    const res = await request(app).get(`/products?categoryId=${categoryId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);

    const empty = await request(app).get(`/products?categoryId=${randomUUID()}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data.length).toBe(0);
  });

  it("sorts products by price ascending", async () => {
    await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Cheap Mouse Pad", price: "9.99" });

    const res = await request(app).get("/products?sortBy=price&sortOrder=asc");
    expect(res.status).toBe(200);
    expect(res.body.data[0].price).toBe("9.99");
    expect(res.body.data[1].price).toBe("49.99");
  });

  it("updates a product as admin", async () => {
    const res = await request(app)
      .patch(`/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Gaming Mouse Pro", price: "79.99", stock: 50 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Gaming Mouse Pro");
    expect(res.body.slug).toBe("gaming-mouse-pro");
    expect(res.body.price).toBe("79.99");
    expect(res.body.stock).toBe(50);
  });

  it("soft deletes a product as admin", async () => {
    const res = await request(app)
      .delete(`/products/${productId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/products/${productId}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 when deleting non-existent product", async () => {
    const res = await request(app)
      .delete(`/products/${randomUUID()}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd backend && npm test`
Expected: All tests pass (health, database, auth, categories, and products tests).

- [ ] **Step 3: Commit**

```bash
cd D:\Github\mini-e-commerce
git add backend/src/tests/products.test.ts
git commit -m "feat(backend): add products integration tests"
```

---

## Acceptance Criteria
- [ ] GET /products returns paginated list with search, filter, and sort support
- [ ] GET /products/:id returns a single product (only active)
- [ ] POST /products creates product with auto-slug (admin only)
- [ ] PATCH /products/:id updates product fields and regenerates slug (admin only)
- [ ] DELETE /products/:id soft deletes by setting isActive=false (admin only)
- [ ] Unauthenticated requests to admin endpoints return 401
- [ ] Customer role requests to admin endpoints return 403
- [ ] Non-existent product IDs return 404
- [ ] Soft-deleted products return 404 on GET
- [ ] All integration tests pass

## Test Plan
- **Integration (supertest):** Empty list, create as admin, RBAC enforcement (no auth, customer role), get by id, 404 on missing, list with data, search by name, filter by category, sort by price, update fields, soft delete, 404 on deleted product, 404 on missing delete
