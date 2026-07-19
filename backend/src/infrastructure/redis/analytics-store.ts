import { redis } from "../../config/redis";

/** Redis-backed analytics store using counters, sorted sets, and daily keys. */
export interface AnalyticsData {
  revenue: number;
  totalOrders: number;
  bestSellers: Array<{ productId: string; score: number }>;
  dailyRevenue: number;
}

export function createAnalyticsStore() {
  return {
    async incrementRevenue(amount: number): Promise<void> {
      await redis.incrbyfloat("analytics:revenue", amount);
    },
    async incrementOrders(): Promise<void> {
      await redis.incr("analytics:total_orders");
    },
    async incrementBestSeller(productId: string, quantity: number): Promise<void> {
      await redis.zincrby("analytics:best_sellers", quantity, productId);
    },
    async recordDailyRevenue(amount: number): Promise<void> {
      const today = new Date().toISOString().slice(0, 10);
      await redis.incrbyfloat(`analytics:daily:${today}`, amount);
    },
    async getAnalytics(): Promise<AnalyticsData> {
      const [revenue, totalOrders, bestSellers, dailyRevenue] = await Promise.all([
        redis.get("analytics:revenue").then(v => Number(v) || 0),
        redis.get("analytics:total_orders").then(v => Number(v) || 0),
        redis.zrevrange("analytics:best_sellers", 0, 9, "WITHSCORES").then(r => {
          const items: AnalyticsData["bestSellers"] = [];
          for (let i = 0; i < r.length; i += 2) items.push({ productId: r[i], score: Number(r[i + 1]) });
          return items;
        }),
        redis.get(`analytics:daily:${new Date().toISOString().slice(0, 10)}`).then(v => Number(v) || 0),
      ]);
      return { revenue, totalOrders, bestSellers, dailyRevenue };
    },
  };
}
