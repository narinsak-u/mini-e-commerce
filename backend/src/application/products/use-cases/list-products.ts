import { z } from "zod";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z.enum(["price", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/** Paginated product list with optional search, category filter, and price/date sorting. */
export function listProductsUseCase(repo: IProductRepository) {
  return async (input: z.infer<typeof schema>) => {
    const params = schema.parse(input);
    return repo.findMany(params);
  };
}
