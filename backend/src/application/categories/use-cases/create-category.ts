import { z } from "zod";
import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";
import { createCategory } from "../../../domain/categories/entities/category";
import { ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

/** Use case factory: creates a new category. @throws ValidationError if name duplicate */
export function createCategoryUseCase(repo: ICategoryRepository) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existing = await repo.findBySlug(slug);
    if (existing) throw new ValidationError("Category with this name already exists");
    const category = createCategory({ name: data.name, description: data.description });
    await repo.save(category);
    return category;
  };
}
