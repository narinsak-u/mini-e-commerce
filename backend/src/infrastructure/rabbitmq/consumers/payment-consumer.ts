import type { Channel, ConsumeMessage } from "amqplib";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { IPaymentRepository } from "../../../domain/payments/repositories/payment-repository";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import type { IInventoryRepository } from "../../../domain/inventory/repositories/inventory-repository";
import type { IAnalyticsStore } from "../../../domain/analytics/repositories/analytics-store";
import { processPaymentUseCase } from "../../../application/payments/use-cases/process-payment";
import { releaseStockUseCase } from "../../../application/inventory/use-cases/release-stock";
import { trackPaymentUseCase } from "../../../application/analytics/use-cases/track-payment";

const EXCHANGE = "shop.exchange";

export function createPaymentConsumer(
  channel: Channel,
  orderRepo: IOrderRepository,
  paymentRepo: IPaymentRepository,
  productRepo: IProductRepository,
  inventoryRepo: IInventoryRepository,
  analytics: IAnalyticsStore,
) {
  const processPayment = processPaymentUseCase(orderRepo, paymentRepo);
  const releaseStock = releaseStockUseCase(productRepo, inventoryRepo);
  const trackPayment = trackPaymentUseCase(analytics);

  return async function start() {
    await channel.bindQueue("payment.request", EXCHANGE, "inventory.reserved");
    await channel.consume("payment.request", async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { orderId } = JSON.parse(msg.content.toString());
        const order = await orderRepo.findById(orderId);
        if (!order) throw new Error(`Order ${orderId} not found`);

        const result = await processPayment({ orderId });

        if (result.success) {
          channel.publish(EXCHANGE, "payment.completed", Buffer.from(JSON.stringify({ orderId, amount: result.amount })), { persistent: true });
          await trackPayment({ orderId, amount: result.amount!, items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })) });
        } else {
          channel.publish(EXCHANGE, "payment.failed", Buffer.from(JSON.stringify({ orderId })), { persistent: true });
          await releaseStock({ orderId, items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })) });
        }
        channel.ack(msg);
      } catch (err) {
        console.error("Payment worker error:", err);
        channel.nack(msg, false, false);
      }
    });
  };
}
