import { eq } from "drizzle-orm";
import { db } from "../../../config/database";
import { payments } from "../drizzle/schema/payments";
import type { IPaymentRepository } from "../../../domain/payments/repositories/payment-repository";
import type { Payment } from "../../../domain/payments/entities/payment";

/** Drizzle implementation of IPaymentRepository. */
export function createDrizzlePaymentRepo(): IPaymentRepository {
  return {
    async findByOrderId(orderId: string): Promise<Payment | null> {
      const row = await db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
      if (!row[0]) return null;
      return { id: row[0].id, orderId: row[0].orderId, amount: Number(row[0].amount), status: row[0].status as Payment["status"], paidAt: row[0].paidAt, createdAt: row[0].createdAt };
    },
    async save(payment: Payment): Promise<void> {
      await db.insert(payments).values({ id: payment.id, orderId: payment.orderId, amount: String(payment.amount), status: payment.status, paidAt: payment.paidAt, createdAt: payment.createdAt });
    },
    async updateStatus(id: string, status: "success" | "failed", paidAt?: Date): Promise<void> {
      await db.update(payments).set({ status, paidAt: paidAt ?? null }).where(eq(payments.id, id));
    },
  };
}
