import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

export function deleteProductUseCase(repo: IProductRepository) {
  return async (id: string) => {
    const existing = await repo.findById(id);
    if (!existing) throw new NotFoundError("Product");
    await repo.delete(id);
  };
}
