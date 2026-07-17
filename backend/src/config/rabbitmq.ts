import amqp from "amqplib";
import { env } from "./env";

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export async function getRabbitChannel(): Promise<amqp.Channel> {
  if (channel) return channel;
  connection = await amqp.connect(env.rabbitmqUrl);
  channel = await connection.createChannel();
  await channel.assertExchange("shop.exchange", "topic", { durable: true });
  return channel;
}

export async function closeRabbit(): Promise<void> {
  await channel?.close();
  await connection?.close();
}
