import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

/** Empties the user's entire cart from Redis. */
export function clearCart(cartRepo: ICartRepository) {
  return async (userId: string) => {
    await cartRepo.clear(userId);
    return { items: [], total: 0 };
  };
}
