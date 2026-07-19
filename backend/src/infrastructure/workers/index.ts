/**
 * Worker orchestrator.
 *
 * Gets a RabbitMQ channel, creates all repository + use case instances,
 * and starts all four consumers in parallel.
 * Each consumer is a separate factory in `rabbitmq/consumers/`.
 */
import type { Channel } from "amqplib";
import { getRabbitChannel } from "../../config/rabbitmq";
import { createDrizzleProductRepo } from "../database/repositories/drizzle-product-repo";
import { createDrizzleInventoryRepo } from "../database/repositories/drizzle-inventory-repo";
import { createDrizzleOrderRepo } from "../database/repositories/drizzle-order-repo";
import { createDrizzlePaymentRepo } from "../database/repositories/drizzle-payment-repo";
import { createDrizzleNotificationRepo } from "../database/repositories/drizzle-notification-repo";
import { createAnalyticsStore } from "../redis/analytics-store";
import { createInventoryConsumer } from "../rabbitmq/consumers/inventory-consumer";
import { createPaymentConsumer } from "../rabbitmq/consumers/payment-consumer";
import { createNotificationConsumer } from "../rabbitmq/consumers/notification-consumer";
import { createAnalyticsConsumer } from "../rabbitmq/consumers/analytics-consumer";

async function waitForRabbit(retries = 10, delayMs = 3000): Promise<Channel> {
  for (let i = 0; i < retries; i++) {
    try {
      return await getRabbitChannel();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`RabbitMQ not ready (attempt ${i + 1}/${retries}), retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error("RabbitMQ unreachable");
}

export async function startWorkers(): Promise<void> {
  const channel = await waitForRabbit();

  const productRepo = createDrizzleProductRepo();
  const inventoryRepo = createDrizzleInventoryRepo();
  const orderRepo = createDrizzleOrderRepo();
  const paymentRepo = createDrizzlePaymentRepo();
  const notificationRepo = createDrizzleNotificationRepo();
  const analytics = createAnalyticsStore();

  await Promise.all([
    createInventoryConsumer(channel, productRepo, inventoryRepo)(),
    createPaymentConsumer(channel, orderRepo, paymentRepo, productRepo, inventoryRepo, analytics)(),
    createNotificationConsumer(channel, orderRepo, notificationRepo)(),
    createAnalyticsConsumer(channel, orderRepo, analytics)(),
  ]);

  console.log("All workers started");
}
