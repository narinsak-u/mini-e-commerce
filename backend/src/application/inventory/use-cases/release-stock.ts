import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import type { IInventoryRepository } from "../../../domain/inventory/repositories/inventory-repository";
import { releaseStock } from "../../../domain/products/entities/product";
import { createInventoryLog } from "../../../domain/inventory/entities/inventory-log";
import { NotFoundError } from "../../../shared/errors/app-error";

interface ReleaseStockInput {
  orderId: string;
  items: Array<{ productId: string; quantity: number }>;
}

/**
 * Restores stock for cancelled/failed orders.
 */
export function releaseStockUseCase(
  productRepo: IProductRepository,
  inventoryRepo: IInventoryRepository,
) {
  return async (input: ReleaseStockInput) => {
    for (const item of input.items) {
      const product = await productRepo.findById(item.productId);
      if (!product) throw new NotFoundError(`Product ${item.productId}`);
      const updated = releaseStock(product, item.quantity);
      await productRepo.update(updated);
      const log = createInventoryLog({
        productId: item.productId,
        orderId: input.orderId,
        quantityChange: item.quantity,
        type: "release",
      });
      await inventoryRepo.save(log);
    }
  };
}
