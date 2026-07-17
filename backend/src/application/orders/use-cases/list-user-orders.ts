import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";

export function listUserOrdersUseCase(orderRepo: IOrderRepository) {
  return async (userId: string, page = 1, limit = 10) => orderRepo.findByUserId(userId, page, limit);
}
