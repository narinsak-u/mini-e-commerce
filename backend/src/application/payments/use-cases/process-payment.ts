import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { IPaymentRepository } from "../../../domain/payments/repositories/payment-repository";
import { createPayment } from "../../../domain/payments/entities/payment";
import { NotFoundError } from "../../../shared/errors/app-error";

interface ProcessPaymentInput {
  orderId: string;
}

/**
 * Creates a payment record, simulates gateway (100ms delay, 90% success),
 * updates payment and order status, and returns the result.
 */
export function processPaymentUseCase(
  orderRepo: IOrderRepository,
  paymentRepo: IPaymentRepository,
) {
  return async (input: ProcessPaymentInput): Promise<{ success: boolean; amount?: number }> => {
    const order = await orderRepo.findById(input.orderId);
    if (!order) throw new NotFoundError(`Order ${input.orderId}`);

    const payment = createPayment({ orderId: input.orderId, amount: order.totalAmount });
    await paymentRepo.save(payment);

    await new Promise(resolve => setTimeout(resolve, 100));
    const success = Math.random() > 0.1;

    if (success) {
      await paymentRepo.updateStatus(payment.id, "success", new Date());
      await orderRepo.updateStatus(input.orderId, "paid");
      return { success: true, amount: order.totalAmount };
    } else {
      await paymentRepo.updateStatus(payment.id, "failed");
      return { success: false };
    }
  };
}
