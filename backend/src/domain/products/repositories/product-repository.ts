import type { Product, ProductWithCategory } from "../entities/product";
import type { PaginatedResult } from "../../categories/repositories/category-repository";

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
  findById(id: string): Promise<ProductWithCategory | null>;
  findBySlug(slug: string): Promise<ProductWithCategory | null>;
  findMany(filters: ProductFilters): Promise<PaginatedResult<ProductWithCategory>>;
  save(product: Product): Promise<void>;
  update(product: Product): Promise<void>;
  delete(id: string): Promise<void>;
}
