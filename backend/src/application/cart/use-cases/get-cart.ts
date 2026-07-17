import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

export function getCart(cartRepo: ICartRepository) {
  return async (userId: string) => cartRepo.findByUserId(userId);
}
