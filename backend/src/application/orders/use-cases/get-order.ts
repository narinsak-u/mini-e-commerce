import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

export function getOrderUseCase(orderRepo: IOrderRepository) {
  return async (id: string) => {
    const order = await orderRepo.findById(id);
    if (!order) throw new NotFoundError("Order");
    return order;
  };
}
