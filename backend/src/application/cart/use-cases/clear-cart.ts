import type { ICartRepository } from "../../../domain/cart/repositories/cart-repository";

export function clearCart(cartRepo: ICartRepository) {
  return async (userId: string) => {
    await cartRepo.clear(userId);
    return { items: [], total: 0 };
  };
}
