import { describe, it, expect } from "vitest";
import { createCacheService } from "../infrastructure/redis/cache-service";

describe("Redis Cache", () => {
  const cache = createCacheService();

  it("stores and retrieves a value", async () => {
    await cache.set("test:key", { hello: "world" }, 60);
    const result = await cache.get<{ hello: string }>("test:key");
    expect(result?.hello).toBe("world");
    await cache.del("test:key");
  });

  it("returns null for missing key", async () => {
    const result = await cache.get("nonexistent");
    expect(result).toBeNull();
  });
});
