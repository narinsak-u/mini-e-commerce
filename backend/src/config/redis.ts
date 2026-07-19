import Redis from "ioredis";
import { env } from "./env";

/** Singleton ioredis client connected to the configured Redis URL. */
export const redis = new Redis(env.redisUrl);
