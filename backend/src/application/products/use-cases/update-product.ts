import { z } from "zod";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { updateProduct } from "../../../domain/products/entities/product";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255).optional(),
  price: z.number().positive().optional(),
  description: z.string().max(5000).optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

/** Updates a product's mutable fields. Only provided fields are changed. */
export function updateProductUseCase(repo: IProductRepository) {
  return async (id: string, input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const existing = await repo.findById(id);
    if (!existing) throw new NotFoundError("Product");
    const updated = updateProduct(existing, data);
    await repo.update(updated);
    return updated;
  };
}
