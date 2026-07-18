import { getRabbitChannel, publishEvent } from "../../config/rabbitmq";
import { createDrizzleProductRepo } from "../database/repositories/drizzle-product-repo";
import { createDrizzleInventoryRepo } from "../database/repositories/drizzle-inventory-repo";
import { createDrizzleOrderRepo } from "../database/repositories/drizzle-order-repo";
import { createDrizzlePaymentRepo } from "../database/repositories/drizzle-payment-repo";
import { createDrizzleNotificationRepo } from "../database/repositories/drizzle-notification-repo";
import { createAnalyticsStore } from "../redis/analytics-store";
import { reserveStockUseCase } from "../../application/inventory/use-cases/reserve-stock";
import { releaseStockUseCase } from "../../application/inventory/use-cases/release-stock";
import { processPaymentUseCase } from "../../application/payments/use-cases/process-payment";
import { trackPaymentUseCase } from "../../application/analytics/use-cases/track-payment";

export async function startWorkers(): Promise<void> {
  const channel = await getRabbitChannel();

  const productRepo = createDrizzleProductRepo();
  const inventoryRepo = createDrizzleInventoryRepo();
  const orderRepo = createDrizzleOrderRepo();
  const paymentRepo = createDrizzlePaymentRepo();
  const notificationRepo = createDrizzleNotificationRepo();
  const analytics = createAnalyticsStore();

  const reserveStock = reserveStockUseCase(productRepo, inventoryRepo);
  const releaseStock = releaseStockUseCase(productRepo, inventoryRepo);
  const processPayment = processPaymentUseCase(orderRepo, paymentRepo);
  const trackPayment = trackPaymentUseCase(analytics);

  // ── Inventory Worker ──────────────────────────────────────────────
  await channel.assertQueue("inventory.updated", { durable: true });
  await channel.bindQueue("inventory.updated", "shop.exchange", "order.created");
  await channel.consume("inventory.updated", async (msg) => {
    if (!msg) return;
    try {
      const { orderId, items } = JSON.parse(msg.content.toString());
      await reserveStock({ orderId, items });
      channel.publish("shop.exchange", "inventory.reserved", Buffer.from(JSON.stringify({ orderId })), { persistent: true });
      channel.ack(msg);
    } catch (err) {
      console.error("Inventory worker error:", err);
      channel.nack(msg, false, false);
    }
  });

  // ── Payment Worker ────────────────────────────────────────────────
  await channel.assertQueue("payment.request", { durable: true });
  await channel.bindQueue("payment.request", "shop.exchange", "inventory.reserved");
  await channel.consume("payment.request", async (msg) => {
    if (!msg) return;
    try {
      const { orderId } = JSON.parse(msg.content.toString());
      const order = await orderRepo.findById(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);

      const result = await processPayment({ orderId });

      if (result.success) {
        channel.publish("shop.exchange", "payment.completed", Buffer.from(JSON.stringify({ orderId, amount: result.amount })), { persistent: true });
        await trackPayment({ orderId, amount: result.amount!, items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })) });
      } else {
        channel.publish("shop.exchange", "payment.failed", Buffer.from(JSON.stringify({ orderId })), { persistent: true });
        await releaseStock({ orderId, items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity })) });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("Payment worker error:", err);
      channel.nack(msg, false, false);
    }
  });

  // ── Notification Worker ───────────────────────────────────────────
  await channel.assertQueue("notification.send", { durable: true });
  for (const key of ["payment.completed", "inventory.failed", "order.shipped", "order.completed"]) {
    await channel.bindQueue("notification.send", "shop.exchange", key);
  }
  await channel.consume("notification.send", async (msg) => {
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

  // ── Analytics Worker ──────────────────────────────────────────────
  await channel.assertQueue("analytics", { durable: true });
  await channel.bindQueue("analytics", "shop.exchange", "payment.completed");
  await channel.consume("analytics", async (msg) => {
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

  console.log("All workers started");
}
