import { getRabbitChannel } from "../../config/rabbitmq";
import { createDrizzleProductRepo } from "../database/repositories/drizzle-product-repo";
import { createDrizzleInventoryRepo } from "../database/repositories/drizzle-inventory-repo";
import { createDrizzleOrderRepo } from "../database/repositories/drizzle-order-repo";
import { createDrizzlePaymentRepo } from "../database/repositories/drizzle-payment-repo";
import { createDrizzleNotificationRepo } from "../database/repositories/drizzle-notification-repo";
import { createAnalyticsStore } from "../redis/analytics-store";

export async function startWorkers(): Promise<void> {
  const channel = await getRabbitChannel();
  const productRepo = createDrizzleProductRepo();
  const inventoryRepo = createDrizzleInventoryRepo();
  const orderRepo = createDrizzleOrderRepo();
  const paymentRepo = createDrizzlePaymentRepo();
  const notificationRepo = createDrizzleNotificationRepo();
  const analytics = createAnalyticsStore();

  await channel.assertQueue("inventory.updated", { durable: true });
  await channel.bindQueue("inventory.updated", "shop.exchange", "order.created");
  await channel.consume("inventory.updated", async (msg) => {
    if (!msg) return;
    try {
      const { orderId, items } = JSON.parse(msg.content.toString());
      for (const item of items) {
        const product = await productRepo.findById(item.productId);
        if (!product || product.stock < item.quantity) throw new Error(`Insufficient stock for ${item.productId}`);
        await productRepo.update({ ...product, stock: product.stock - item.quantity, updatedAt: new Date() });
        const log = { id: crypto.randomUUID(), productId: item.productId, orderId, quantityChange: -item.quantity, type: "reserve" as const, createdAt: new Date() };
        await inventoryRepo.save(log);
      }
      channel.publish("shop.exchange", "inventory.reserved", Buffer.from(JSON.stringify({ orderId })), { persistent: true });
      channel.ack(msg);
    } catch (err) {
      console.error("Inventory worker error:", err);
      channel.nack(msg, false, false);
    }
  });

  await channel.assertQueue("payment.request", { durable: true });
  await channel.bindQueue("payment.request", "shop.exchange", "inventory.reserved");
  await channel.consume("payment.request", async (msg) => {
    if (!msg) return;
    try {
      const { orderId } = JSON.parse(msg.content.toString());
      const order = await orderRepo.findById(orderId);
      if (!order) throw new Error(`Order ${orderId} not found`);
      const payment = { id: crypto.randomUUID(), orderId, amount: order.totalAmount, status: "pending" as const, paidAt: null, createdAt: new Date() };
      await paymentRepo.save(payment);
      await new Promise(resolve => setTimeout(resolve, 100));
      const success = Math.random() > 0.1;
      if (success) {
        await paymentRepo.updateStatus(payment.id, "success", new Date());
        await orderRepo.updateStatus(orderId, "paid");
        channel.publish("shop.exchange", "payment.completed", Buffer.from(JSON.stringify({ orderId, amount: order.totalAmount })), { persistent: true });
        await analytics.incrementRevenue(order.totalAmount);
        await analytics.incrementOrders();
        for (const item of order.items) await analytics.incrementBestSeller(item.productId, item.quantity);
        await analytics.recordDailyRevenue(order.totalAmount);
      } else {
        await paymentRepo.updateStatus(payment.id, "failed");
        channel.publish("shop.exchange", "payment.failed", Buffer.from(JSON.stringify({ orderId })), { persistent: true });
      }
      channel.ack(msg);
    } catch (err) {
      console.error("Payment worker error:", err);
      channel.nack(msg, false, false);
    }
  });

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
        const notif = { id: crypto.randomUUID(), userId: order.userId, type: "payment_success" as const, title: "Payment Successful", body: `Your payment of $${order.totalAmount} was successful.`, read: false, createdAt: new Date() };
        await notificationRepo.save(notif);
        console.log(`Email notification sent to user ${order.userId}: Payment successful`);
      }
      channel.ack(msg);
    } catch (err) {
      console.error("Notification worker error:", err);
      channel.nack(msg, false, false);
    }
  });

  console.log("All workers started");
}
