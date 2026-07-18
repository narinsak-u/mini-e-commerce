import type { IAnalyticsStore } from "../../../domain/analytics/repositories/analytics-store";

interface TrackPaymentInput {
  orderId: string;
  amount: number;
  items: Array<{ productId: string; quantity: number }>;
}

/** Records analytics for a completed payment. */
export function trackPaymentUseCase(analytics: IAnalyticsStore) {
  return async (input: TrackPaymentInput) => {
    await Promise.all([
      analytics.incrementRevenue(input.amount),
      analytics.incrementOrders(),
      analytics.recordDailyRevenue(input.amount),
      ...input.items.map(item => analytics.incrementBestSeller(item.productId, item.quantity)),
    ]);
  };
}
