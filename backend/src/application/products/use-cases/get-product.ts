import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

/** Fetches a single product by ID with category join. */
export function getProductUseCase(repo: IProductRepository) {
  return async (id: string) => {
    const product = await repo.findById(id);
    if (!product) throw new NotFoundError("Product");
    return product;
  };
}
