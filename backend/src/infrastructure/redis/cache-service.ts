import { redis } from "../../config/redis";

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
}

export function createCacheService(): CacheService {
  return {
    async get<T>(key: string): Promise<T | null> {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    },
    async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    },
    async del(key: string): Promise<void> {
      await redis.del(key);
    },
    async delPattern(pattern: string): Promise<void> {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) await redis.del(...keys);
    },
  };
}
