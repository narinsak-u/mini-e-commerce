import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { IProductRepository } from "../../../domain/products/repositories/product-repository";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import { createAnalyticsStore } from "../../../infrastructure/redis/analytics-store";

export function getDashboardUseCase(orderRepo: IOrderRepository, productRepo: IProductRepository, userRepo: IUserRepository) {
  return async () => {
    const analytics = createAnalyticsStore();
    const [analyticsData, ordersResult, productsResult, usersResult] = await Promise.all([
      analytics.getAnalytics(),
      orderRepo.findAll(1, 5).catch(() => ({ data: [], total: 0 })),
      productRepo.findMany({ page: 1, limit: 5 }).catch(() => ({ data: [], total: 0 })),
      userRepo.findByEmail("").catch(() => null),
    ]);
    return {
      revenue: analyticsData.revenue,
      totalOrders: analyticsData.totalOrders,
      bestSellers: analyticsData.bestSellers,
      dailyRevenue: analyticsData.dailyRevenue,
      recentOrders: ordersResult.data,
      totalProducts: analyticsData.totalOrders,
      lowStockProducts: productsResult.data.filter(p => p.stock < 10),
    };
  };
}
