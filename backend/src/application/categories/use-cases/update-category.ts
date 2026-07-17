import { z } from "zod";
import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";
import { updateCategory } from "../../../domain/categories/entities/category";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

/** Use case factory: updates a category. @throws NotFoundError if id invalid */
export function updateCategoryUseCase(repo: ICategoryRepository) {
  return async (id: string, input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const existing = await repo.findById(id);
    if (!existing) throw new NotFoundError("Category");
    const updated = updateCategory(existing, data);
    await repo.update(updated);
    return updated;
  };
}
