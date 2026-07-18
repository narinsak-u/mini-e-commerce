import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import type { IInventoryRepository } from "../../../domain/inventory/repositories/inventory-repository";
import { reduceStock } from "../../../domain/products/entities/product";
import { createInventoryLog } from "../../../domain/inventory/entities/inventory-log";
import { NotFoundError } from "../../../shared/errors/app-error";

interface ReserveStockInput {
  orderId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
}

/**
 * Validates stock, deducts quantities, and logs inventory reservation.
 * Throws if any product has insufficient stock.
 */
export function reserveStockUseCase(
  productRepo: IProductRepository,
  inventoryRepo: IInventoryRepository,
) {
  return async (input: ReserveStockInput) => {
    for (const item of input.items) {
      const product = await productRepo.findById(item.productId);
      if (!product) throw new NotFoundError(`Product ${item.productId}`);
      const updated = reduceStock(product, item.quantity);
      if (!updated) throw new Error(`Insufficient stock for product ${item.productId}`);
      await productRepo.update(updated);
      const log = createInventoryLog({
        productId: item.productId,
        orderId: input.orderId,
        quantityChange: -item.quantity,
        type: "reserve",
      });
      await inventoryRepo.save(log);
    }
  };
}
