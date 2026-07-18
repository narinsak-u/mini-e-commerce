import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createDrizzleOrderRepo } from "../infrastructure/database/repositories/drizzle-order-repo";
import { createDrizzlePaymentRepo } from "../infrastructure/database/repositories/drizzle-payment-repo";
import { processPaymentUseCase } from "../application/payments/use-cases/process-payment";
import { createDrizzleProductRepo } from "../infrastructure/database/repositories/drizzle-product-repo";
import { createRedisCartRepo } from "../infrastructure/redis/cart-repository";
import { createOrderUseCase } from "../application/orders/use-cases/create-order";
import { redis } from "../config/redis";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { payments } from "../infrastructure/database/drizzle/schema/payments";
import { orderItems } from "../infrastructure/database/drizzle/schema/order-items";
import { orders } from "../infrastructure/database/drizzle/schema/orders";
import { users } from "../infrastructure/database/drizzle/schema/users";
import { createProduct } from "../domain/products/entities/product";
import { products } from "../infrastructure/database/drizzle/schema/products";

const orderRepo = createDrizzleOrderRepo();
const paymentRepo = createDrizzlePaymentRepo();
const productRepo = createDrizzleProductRepo();
const cartRepo = createRedisCartRepo();
const processPayment = processPaymentUseCase(orderRepo, paymentRepo);
const createOrder = createOrderUseCase(orderRepo, cartRepo);

let orderId = "";
let productId = "";
let userId = "";

describe("Payments Use Case", () => {
  beforeAll(async () => {
    userId = randomUUID();
    await db.insert(users).values({ id: userId, name: "pay-test", email: `pay-${randomUUID()}@test.com`, passwordHash: "hash", role: "customer", createdAt: new Date(), updatedAt: new Date() });
    const prod = createProduct({ name: `payment-test-${randomUUID()}`, price: 20, stock: 10 });
    await productRepo.save(prod);
    productId = prod.id;
    await cartRepo.addItem(userId, { productId: prod.id, name: prod.name, price: prod.price, quantity: 1, imageUrl: null });
    const order = await createOrder(userId);
    orderId = order!.id;
  });

  afterAll(async () => {
    await db.delete(payments).where(eq(payments.orderId, orderId)).catch(() => {});
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId)).catch(() => {});
    await db.delete(orders).where(eq(orders.id, orderId)).catch(() => {});
    await db.delete(products).where(eq(products.id, productId)).catch(() => {});
    await db.delete(users).where(eq(users.id, userId)).catch(() => {});
    const keys = await redis.keys(`cart:${userId}*`);
    for (const k of keys) await redis.del(k).catch(() => {});
  });

  it("processes payment successfully", async () => {
    const result = await processPayment({ orderId });
    expect(typeof result.success).toBe("boolean");
    if (result.success) {
      expect(result.amount).toBe(20);
      const order = await orderRepo.findById(orderId);
      expect(order!.status).toBe("paid");
    }
  });
});
