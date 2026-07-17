import { z } from "zod";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { OrderStatus } from "../../../shared/types";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({ status: z.enum(["pending", "paid", "packing", "shipping", "completed", "cancelled"]) });

export function updateOrderStatusUseCase(orderRepo: IOrderRepository) {
  return async (id: string, input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const order = await orderRepo.findById(id);
    if (!order) throw new NotFoundError("Order");
    await orderRepo.updateStatus(id, data.status as OrderStatus);
    return orderRepo.findById(id);
  };
}
