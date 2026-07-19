import type { Channel, ConsumeMessage } from "amqplib";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { IAnalyticsStore } from "../../../domain/analytics/repositories/analytics-store";
import { trackPaymentUseCase } from "../../../application/analytics/use-cases/track-payment";

const EXCHANGE = "shop.exchange";

/**
 * Factory for the Analytics consumer.
 *
 * **Workflow:**
 * 1. Listens on `analytics` queue (bound to `payment.completed`)
 * 2. On message: parses `{ orderId, amount }`, fetches the full order
 * 3. Calls `trackPayment` use case which increments:
 *    - Total revenue (`analytics:revenue`)
 *    - Total order count (`analytics:total_orders`)
 *    - Daily revenue (`analytics:daily:YYYY-MM-DD`)
 *    - Best seller scores (`analytics:best_sellers` sorted set)
 *
 * All analytics data lives in Redis — no PostgreSQL writes.
 *
 * **Error handling:** nack without requeue → DLQ.
 */
export function createAnalyticsConsumer(
  channel: Channel,
  orderRepo: IOrderRepository,
  analytics: IAnalyticsStore,
) {
  const trackPayment = trackPaymentUseCase(analytics);

  return async function start() {
    await channel.bindQueue("analytics", EXCHANGE, "payment.completed");
    await channel.consume("analytics", async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const { orderId, amount } = JSON.parse(msg.content.toString());
        const order = await orderRepo.findById(orderId);
        if (order) {
          await trackPayment({ orderId, amount, items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })) });
        }
        channel.ack(msg);
      } catch (err) {
        console.error("Analytics worker error:", err);
        channel.nack(msg, false, false);
      }
    });
  };
}
