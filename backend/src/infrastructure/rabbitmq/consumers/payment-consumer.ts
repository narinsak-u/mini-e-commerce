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

/**
 * Factory for the Payment consumer.
 *
 * **Workflow:**
 * 1. Listens on `payment.request` queue (bound to `inventory.reserved` routing key)
 * 2. On message: parses `{ orderId }`, fetches the order from PostgreSQL
 * 3. Calls `processPayment` use case which:
 *    a. Creates a payment record (status: "pending")
 *    b. Simulates a 100ms gateway delay
 *    c. 90% success rate (configurable randomness)
 * 4. **On success:**
 *    - Publishes `payment.completed` event → triggers Notification + Analytics workers
 *    - Tracks analytics (revenue, best sellers, daily stats)
 * 5. **On failure:**
 *    - Publishes `payment.failed` event
 *    - Calls `releaseStock` to restore inventory from the reserved quantities
 *
 * **Error handling:** nack without requeue → DLQ.
 */
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
