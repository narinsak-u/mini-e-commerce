/**
 * Worker orchestrator.
 *
 * Gets a RabbitMQ channel, creates all repository + use case instances,
 * and starts all four consumers in parallel.
 * Each consumer is a separate factory in `rabbitmq/consumers/`.
 */
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

export async function startWorkers(): Promise<void> {
  const channel = await getRabbitChannel();

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
