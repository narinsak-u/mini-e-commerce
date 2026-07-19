import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

/** Retrieves the user's full cart from Redis with computed total. */
export function getCart(cartRepo: ICartRepository) {
  return async (userId: string) => cartRepo.findByUserId(userId);
}
