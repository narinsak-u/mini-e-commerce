import { redis } from "../../config/redis";
import { db } from "../../config/database";
import { products } from "../database/drizzle/schema/products";
import { eq } from "drizzle-orm";
import type { ICartRepository } from "../../domain/cart/repositories/cart-repository";
import type { Cart, CartItem } from "../../domain/cart/entities/cart";

function cartKey(userId: string): string {
  return `cart:${userId}`;
}

export function createRedisCartRepo(): ICartRepository {
  return {
    async findByUserId(userId: string): Promise<Cart> {
      const raw = await redis.hgetall(cartKey(userId));
      const items: CartItem[] = [];
      for (const [productId, qtyStr] of Object.entries(raw)) {
        const quantity = Number(qtyStr);
        if (quantity <= 0) continue;
        const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
        if (product[0]) {
          items.push({ productId, quantity, name: product[0].name, price: Number(product[0].price), imageUrl: product[0].imageUrl });
        }
      }
      const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { items, total };
    },
    async addItem(userId: string, item: CartItem): Promise<void> {
      const current = await redis.hget(cartKey(userId), item.productId);
      const qty = (Number(current) || 0) + item.quantity;
      await redis.hset(cartKey(userId), item.productId, qty);
    },
    async updateQuantity(userId: string, productId: string, quantity: number): Promise<void> {
      if (quantity <= 0) { await redis.hdel(cartKey(userId), productId); return; }
      await redis.hset(cartKey(userId), productId, quantity);
    },
    async removeItem(userId: string, productId: string): Promise<void> {
      await redis.hdel(cartKey(userId), productId);
    },
    async clear(userId: string): Promise<void> {
      await redis.del(cartKey(userId));
    },
  };
}
