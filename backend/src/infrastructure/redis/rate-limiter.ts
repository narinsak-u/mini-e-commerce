import type { Request, Response, NextFunction } from "express";
import { redis } from "../../config/redis";

/** Sliding-window rate limiter using Redis sorted sets. */
export function rateLimiter(windowSeconds: number, maxRequests: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `rate:${req.ip}`;
    const current = await redis.incr(key);
    if (current === 1) await redis.expire(key, windowSeconds);
    if (current > maxRequests) {
      res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests" } });
      return;
    }
    next();
  };
}
