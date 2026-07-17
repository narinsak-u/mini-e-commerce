import { z } from "zod";
import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

const schema = z.object({ quantity: z.number().int().min(0) });

export function updateCartItem(cartRepo: ICartRepository) {
  return async (userId: string, productId: string, input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    await cartRepo.updateQuantity(userId, productId, data.quantity);
    return cartRepo.findByUserId(userId);
  };
}
