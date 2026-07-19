import type { Channel, ConsumeMessage } from "amqplib";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";

const EXCHANGE = "shop.exchange";

/**
 * Factory for the Notification consumer.
 *
 * **Workflow:**
 * 1. Listens on `notification.send` queue bound to 4 routing keys:
 *    `payment.completed`, `inventory.failed`, `order.shipped`, `order.completed`
 * 2. On message: parses the event, fetches the order to get the user ID
 * 3. Saves an in-app notification record to PostgreSQL
 * 4. Logs a mock email notification to stdout
 *
 * **Current coverage:** handles `payment_success` type.
 * Extend by switching on `event.type` for order_shipped, order_completed, etc.
 *
 * **Error handling:** nack without requeue → DLQ.
 */
export function createNotificationConsumer(
  channel: Channel,
  orderRepo: IOrderRepository,
  notificationRepo: INotificationRepository,
) {
  return async function start() {
    for (const key of ["payment.completed", "inventory.failed", "order.shipped", "order.completed"]) {
      await channel.bindQueue("notification.send", EXCHANGE, key);
    }
    await channel.consume("notification.send", async (msg: ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString());
        const order = await orderRepo.findById(event.orderId);
        if (order) {
          const notif = {
            id: crypto.randomUUID(),
            userId: order.userId,
            type: "payment_success" as const,
            title: "Payment Successful",
            body: `Your payment of $${order.totalAmount} was successful.`,
            read: false,
            createdAt: new Date(),
          };
          await notificationRepo.save(notif);
          console.log(`Notification sent to user ${order.userId}: Payment successful`);
        }
        channel.ack(msg);
      } catch (err) {
        console.error("Notification worker error:", err);
        channel.nack(msg, false, false);
      }
    });
  };
}
