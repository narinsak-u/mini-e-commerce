import { eq, like, desc, asc, count, and, sql } from "drizzle-orm";
import { db } from "../../../config/database";
import { products } from "../drizzle/schema/products";
import { categories } from "../drizzle/schema/categories";
import type { IProductRepository, ProductFilters } from "../../../domain/products/repositories/product-repository";
import type { Product, ProductWithCategory } from "../../../domain/products/entities/product";

export function createDrizzleProductRepo(): IProductRepository {
  return {
    async findById(id: string): Promise<ProductWithCategory | null> {
      const row = await db.select().from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(eq(products.id, id)).limit(1);
      if (!row[0]) return null;
      return rowToProductWithCategory(row[0]);
    },
    async findBySlug(slug: string): Promise<ProductWithCategory | null> {
      const row = await db.select().from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(eq(products.slug, slug)).limit(1);
      if (!row[0]) return null;
      return rowToProductWithCategory(row[0]);
    },
    async findMany(filters: ProductFilters): Promise<{ data: ProductWithCategory[]; total: number; page: number; limit: number }> {
      const { page, limit, search, categoryId, sortBy, sortOrder } = filters;
      const offset = (page - 1) * limit;
      const conditions = [eq(products.isActive, true)];
      if (search) conditions.push(sql`(${like(products.name, `%${search}%`)} OR ${like(products.description, `%${search}%`)})`);
      if (categoryId) conditions.push(eq(products.categoryId, categoryId));
      const where = and(...conditions);
      const orderBy = sortBy === "price" ? (sortOrder === "desc" ? desc(products.price) : asc(products.price)) : (sortOrder === "asc" ? asc(products.createdAt) : desc(products.createdAt));
      const [rows, totalResult] = await Promise.all([
        db.select().from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(where).orderBy(orderBy).limit(limit).offset(offset),
        db.select({ value: count() }).from(products).where(where),
      ]);
      return { data: rows.map(rowToProductWithCategory), total: Number(totalResult[0].value), page, limit };
    },
    async save(product: Product): Promise<void> {
      await db.insert(products).values({ id: product.id, name: product.name, slug: product.slug, description: product.description, price: String(product.price), stock: product.stock, categoryId: product.categoryId, imageUrl: product.imageUrl, isActive: product.isActive, createdAt: product.createdAt, updatedAt: product.updatedAt });
    },
    async update(product: Product): Promise<void> {
      await db.update(products).set({ name: product.name, slug: product.slug, description: product.description, price: String(product.price), stock: product.stock, categoryId: product.categoryId, imageUrl: product.imageUrl, isActive: product.isActive, updatedAt: product.updatedAt }).where(eq(products.id, product.id));
    },
    async delete(id: string): Promise<void> {
      await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id));
    },
  };
}

function rowToProductWithCategory(row: typeof products.$inferSelect & { categories?: typeof categories.$inferSelect | null }): ProductWithCategory {
  return {
    id: row.products.id, name: row.products.name, slug: row.products.slug, description: row.products.description,
    price: Number(row.products.price), stock: row.products.stock, categoryId: row.products.categoryId,
    imageUrl: row.products.imageUrl, isActive: row.products.isActive, createdAt: row.products.createdAt, updatedAt: row.products.updatedAt,
    category: row.categories ? { id: row.categories.id, name: row.categories.name, slug: row.categories.slug, description: row.categories.description, createdAt: row.categories.createdAt, updatedAt: row.categories.updatedAt } : undefined,
  };
}
