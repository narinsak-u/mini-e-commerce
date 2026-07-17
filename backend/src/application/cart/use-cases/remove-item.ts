import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

export function removeCartItem(cartRepo: ICartRepository) {
  return async (userId: string, productId: string) => {
    await cartRepo.removeItem(userId, productId);
    return cartRepo.findByUserId(userId);
  };
}
