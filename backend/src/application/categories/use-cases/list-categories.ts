import { z } from "zod";
import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

/** Use case factory: lists categories with pagination and optional search. */
export function listCategoriesUseCase(repo: ICategoryRepository) {
  return async (input: z.infer<typeof schema>) => {
    const params = schema.parse(input);
    return repo.findAll(params);
  };
}
