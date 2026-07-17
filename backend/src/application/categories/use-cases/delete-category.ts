import type { ICategoryRepository } from "../../../domain/categories/repositories/category-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

/** Use case factory: deletes a category by ID. @throws NotFoundError if id invalid */
export function deleteCategoryUseCase(repo: ICategoryRepository) {
  return async (id: string) => {
    const existing = await repo.findById(id);
    if (!existing) throw new NotFoundError("Category");
    await repo.delete(id);
  };
}
