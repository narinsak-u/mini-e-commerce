import amqp from "amqplib";
import { env } from "./env";

// ponytail: amqplib types conflict with installed amqplib version
let connection: any = null;
let channel: amqp.Channel | null = null;

const DLX = "shop.dlx";
const DLQ = "shop.dead-letter";
const MAIN_EXCHANGE = "shop.exchange";

const QUEUES = [
  "inventory.updated",
  "payment.request",
  "notification.send",
  "analytics",
] as const;

async function setupInfrastructure(ch: amqp.Channel): Promise<void> {
  await ch.assertExchange(MAIN_EXCHANGE, "topic", { durable: true });
  await ch.assertExchange(DLX, "fanout", { durable: true });
  await ch.assertQueue(DLQ, { durable: true });
  await ch.bindQueue(DLQ, DLX, "");
  // Delete old queues first so we can assert with fresh DLX args
  for (const q of QUEUES) {
    await ch.deleteQueue(q).catch(() => {});
    await ch.assertQueue(q, { durable: true, arguments: { "x-dead-letter-exchange": DLX } });
  }
}

/** Queue options with dead-lettering via shop.dlx. */
export function dlqOptions(): amqp.Options.AssertQueue {
  return { durable: true, arguments: { "x-dead-letter-exchange": DLX } };
}

export async function getRabbitChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  connection = await amqp.connect(env.rabbitmqUrl);
  const ch: amqp.Channel = await connection.createChannel();
  channel = ch;
  await setupInfrastructure(ch);
  return ch;
}

export async function publishEvent(routingKey: string, payload: unknown): Promise<void> {
  try {
    const ch = await getRabbitChannel();
    ch.publish(MAIN_EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
  } catch (err) {
    console.error(`Failed to publish event ${routingKey}:`, err);
  }
}

export async function closeRabbit(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
