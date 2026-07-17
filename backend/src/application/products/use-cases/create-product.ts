import { z } from "zod";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { createProduct } from "../../../domain/products/entities/product";
import { ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  description: z.string().max(5000).optional(),
  stock: z.number().int().min(0).optional(),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().max(500).optional(),
});

export function createProductUseCase(repo: IProductRepository) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const slug = data.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const existing = await repo.findBySlug(slug);
    if (existing) throw new ValidationError("Product with this name already exists");
    const product = createProduct(data);
    await repo.save(product);
    return product;
  };
}
