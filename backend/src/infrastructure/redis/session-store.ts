import { redis } from "../../config/redis";

export interface SessionData {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

const TTL = 60 * 60 * 24 * 7; // 7 days

/**
 * Caches JWT payload in Redis so we can validate sessions without
 * decoding the token on every request. Key is the token itself (hashed).
 */
export function createSessionStore() {
  return {
    async set(tokenHash: string, session: SessionData): Promise<void> {
      await redis.setex(`session:${tokenHash}`, TTL, JSON.stringify(session));
    },
    async get(tokenHash: string): Promise<SessionData | null> {
      const raw = await redis.get(`session:${tokenHash}`);
      return raw ? JSON.parse(raw) : null;
    },
    async del(tokenHash: string): Promise<void> {
      await redis.del(`session:${tokenHash}`);
    },
    /** Extends TTL on each access — active sessions stay alive. */
    async touch(tokenHash: string): Promise<void> {
      await redis.expire(`session:${tokenHash}`, TTL);
    },
  };
}
