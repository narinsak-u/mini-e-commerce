import { z } from "zod";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1) });

export function addCartItem(cartRepo: ICartRepository, productRepo: IProductRepository) {
  return async (userId: string, input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const product = await productRepo.findById(data.productId);
    if (!product) throw new NotFoundError("Product");
    await cartRepo.addItem(userId, { productId: data.productId, quantity: data.quantity, name: product.name, price: product.price, imageUrl: product.imageUrl });
    return cartRepo.findByUserId(userId);
  };
}
