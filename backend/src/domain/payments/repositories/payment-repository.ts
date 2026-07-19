import type { Payment } from "../entities/payment";

/** Repository interface for Payment persistence. */
export interface IPaymentRepository {
  findByOrderId(orderId: string): Promise<Payment | null>;
  save(payment: Payment): Promise<void>;
  updateStatus(id: string, status: "success" | "failed", paidAt?: Date): Promise<void>;
}
