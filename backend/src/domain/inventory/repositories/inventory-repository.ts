import type { InventoryLog } from "../entities/inventory-log";

export interface IInventoryRepository {
  save(log: InventoryLog): Promise<void>;
  findByProductId(productId: string): Promise<InventoryLog[]>;
}
