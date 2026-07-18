import amqp from "amqplib";
import { env } from "./env";

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

const DLX = "shop.dlx";
const DLQ = "shop.dead-letter";

/** Ensures the dead-letter exchange and queue exist. */
async function setupDeadLetterQueue(ch: amqp.Channel): Promise<void> {
  await ch.assertExchange(DLX, "fanout", { durable: true });
  await ch.assertQueue(DLQ, { durable: true });
  await ch.bindQueue(DLQ, DLX, "");
}

/** Queue options with dead-lettering via shop.dlx. */
export function dlqOptions(): amqp.Options.AssertQueue {
  return { durable: true, arguments: { "x-dead-letter-exchange": DLX } };
}

export async function getRabbitChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();
  await channel.assertExchange("shop.exchange", "topic", { durable: true });
  await setupDeadLetterQueue(channel);
  return channel;
}

export async function publishEvent(routingKey: string, payload: unknown): Promise<void> {
  const ch = await getRabbitChannel();
  ch.publish("shop.exchange", routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
}

export async function closeRabbit(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
