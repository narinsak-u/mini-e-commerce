import type { Cart, CartItem } from "../entities/cart";

export interface ICartRepository {
  findByUserId(userId: string): Promise<Cart>;
  addItem(userId: string, item: CartItem): Promise<void>;
  updateQuantity(userId: string, productId: string, quantity: number): Promise<void>;
  removeItem(userId: string, productId: string): Promise<void>;
  clear(userId: string): Promise<void>;
}
