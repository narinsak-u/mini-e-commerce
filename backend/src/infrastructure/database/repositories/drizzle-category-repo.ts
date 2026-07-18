import { eq, like, desc, count } from "drizzle-orm";
import { db } from "../../../config/database";
import { categories } from "../drizzle/schema/categories";
import type {
  ICategoryRepository,
  PaginatedResult,
} from "../../../domain/categories/repositories/category-repository";
import type { Category } from "../../../domain/categories/entities/category";

/** Creates an ICategoryRepository backed by Drizzle ORM. */
export function createDrizzleCategoryRepo(): ICategoryRepository {
  return {
    async findById(id: string): Promise<Category | null> {
      const row = await db
        .select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);
      if (!row[0]) return null;
      return rowToCategory(row[0]);
    },
    async findBySlug(slug: string): Promise<Category | null> {
      const row = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);
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
        data: rows.map(rowToCategory),
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
