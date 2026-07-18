import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { createDrizzleProductRepo } from "../infrastructure/database/repositories/drizzle-product-repo";
import { createDrizzleInventoryRepo } from "../infrastructure/database/repositories/drizzle-inventory-repo";
import { reserveStockUseCase } from "../application/inventory/use-cases/reserve-stock";
import { releaseStockUseCase } from "../application/inventory/use-cases/release-stock";
import { createProduct } from "../domain/products/entities/product";
import { db } from "../config/database";
import { eq } from "drizzle-orm";
import { products } from "../infrastructure/database/drizzle/schema/products";
import { inventoryLogs } from "../infrastructure/database/drizzle/schema/inventory-logs";
import { orders } from "../infrastructure/database/drizzle/schema/orders";
import { users } from "../infrastructure/database/drizzle/schema/users";

const productRepo = createDrizzleProductRepo();
const inventoryRepo = createDrizzleInventoryRepo();
const reserveStock = reserveStockUseCase(productRepo, inventoryRepo);
const releaseStock = releaseStockUseCase(productRepo, inventoryRepo);

let productId = "";
let orderId = "";
let userId = "";

describe("Inventory Use Cases", () => {
  beforeAll(async () => {
    userId = randomUUID();
    await db.insert(users).values({ id: userId, name: "inv-test", email: `inv-${randomUUID()}@test.com`, passwordHash: "hash", role: "customer", createdAt: new Date(), updatedAt: new Date() });
    orderId = randomUUID();
    await db.insert(orders).values({ id: orderId, userId, status: "pending", totalAmount: "20", createdAt: new Date(), updatedAt: new Date() });
    const prod = createProduct({ name: "inventory-test", price: 10, stock: 5 });
    await productRepo.save(prod);
    productId = prod.id;
  });

  afterAll(async () => {
    await db.delete(inventoryLogs).where(eq(inventoryLogs.productId, productId)).catch(() => {});
    await db.delete(inventoryLogs).where(eq(inventoryLogs.orderId, orderId)).catch(() => {});
    await db.delete(products).where(eq(products.id, productId)).catch(() => {});
    await db.delete(orders).where(eq(orders.id, orderId)).catch(() => {});
    await db.delete(users).where(eq(users.id, userId)).catch(() => {});
  });

  it("reserves stock", async () => {
    await reserveStock({ orderId, items: [{ productId, quantity: 2, price: 10 }] });
    const prod = await productRepo.findById(productId);
    expect(prod!.stock).toBe(3);
  });

  it("rejects insufficient stock", async () => {
    const otherOrderId = randomUUID();
    await db.insert(orders).values({ id: otherOrderId, userId, status: "pending", totalAmount: "0", createdAt: new Date(), updatedAt: new Date() });
    await expect(reserveStock({ orderId: otherOrderId, items: [{ productId, quantity: 99, price: 10 }] })).rejects.toThrow("Insufficient stock");
    await db.delete(orders).where(eq(orders.id, otherOrderId)).catch(() => {});
  });

  it("releases stock", async () => {
    await releaseStock({ orderId, items: [{ productId, quantity: 2 }] });
    const prod = await productRepo.findById(productId);
    expect(prod!.stock).toBe(5);
  });

  it("creates inventory logs", async () => {
    const logs = await inventoryRepo.findByProductId(productId);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs.some(l => l.type === "reserve")).toBe(true);
  });
});
