import type { InventoryLog } from "../entities/inventory-log";

/** Repository interface for inventory log persistence. */
export interface IInventoryRepository {
  save(log: InventoryLog): Promise<void>;
  findByProductId(productId: string): Promise<InventoryLog[]>;
}
