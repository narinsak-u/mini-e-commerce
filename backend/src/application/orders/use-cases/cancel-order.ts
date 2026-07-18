import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import { NotFoundError, ForbiddenError } from "../../../shared/errors/app-error";

/**
 * Cancels an order — only the owner can cancel, and only if status is "pending".
 */
export function cancelOrderUseCase(orderRepo: IOrderRepository) {
  return async (orderId: string, userId: string) => {
    const order = await orderRepo.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    if (order.userId !== userId) throw new ForbiddenError("Not your order");
    if (order.status !== "pending") throw new Error("Only pending orders can be cancelled");
    await orderRepo.updateStatus(orderId, "cancelled");
    return orderRepo.findById(orderId);
  };
}
