import type { Channel, ConsumeMessage } from "amqplib";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import type { IInventoryRepository } from "../../../domain/inventory/repositories/inventory-repository";
import { reserveStockUseCase } from "../../../application/inventory/use-cases/reserve-stock";

const EXCHANGE = "shop.exchange";

export function createInventoryConsumer(
  channel: Channel,
  productRepo: IProductRepository,
  inventoryRepo: IInventoryRepository,
) {
  const reserveStock = reserveStockUseCase(productRepo, inventoryRepo);

  return async function start() {
    await channel.bindQueue("inventory.updated", EXCHANGE, "order.created");
    await channel.consume("inventory.updated", async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { orderId, items } = JSON.parse(msg.content.toString());
        await reserveStock({ orderId, items });
        channel.publish(EXCHANGE, "inventory.reserved", Buffer.from(JSON.stringify({ orderId })), { persistent: true });
        channel.ack(msg);
      } catch (err) {
        console.error("Inventory worker error:", err);
        channel.nack(msg, false, false);
      }
    });
  };
}
