/** Redis-backed analytics store using counters, sorted sets, and daily keys. */
export interface IAnalyticsStore {
  incrementRevenue(amount: number): Promise<void>;
  incrementOrders(): Promise<void>;
  incrementBestSeller(productId: string, quantity: number): Promise<void>;
  recordDailyRevenue(amount: number): Promise<void>;
  getAnalytics(): Promise<{
    revenue: number;
    totalOrders: number;
    bestSellers: Array<{ productId: string; score: number }>;
    dailyRevenue: number;
  }>;
}
