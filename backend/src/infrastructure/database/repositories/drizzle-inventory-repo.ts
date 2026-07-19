import { eq } from "drizzle-orm";
import { db } from "../../../config/database";
import { inventoryLogs } from "../drizzle/schema/inventory-logs";
import type { IInventoryRepository } from "../../../domain/inventory/repositories/inventory-repository";
import type { InventoryLog } from "../../../domain/inventory/entities/inventory-log";

/** Drizzle implementation of IInventoryRepository. */
export function createDrizzleInventoryRepo(): IInventoryRepository {
  return {
    async save(log: InventoryLog): Promise<void> {
      await db.insert(inventoryLogs).values({ id: log.id, productId: log.productId, orderId: log.orderId, quantityChange: log.quantityChange, type: log.type, createdAt: log.createdAt });
    },
    async findByProductId(productId: string): Promise<InventoryLog[]> {
      const rows = await db.select().from(inventoryLogs).where(eq(inventoryLogs.productId, productId));
      return rows.map(r => ({ id: r.id, productId: r.productId, orderId: r.orderId, quantityChange: r.quantityChange, type: r.type as InventoryLog["type"], createdAt: r.createdAt }));
    },
  };
}
