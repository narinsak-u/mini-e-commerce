/**
 * Represents a payment attempt for an order.
 *
 * **Status lifecycle:**
 * `pending → success` (payment gateway approved)
 * `pending → failed` (payment gateway declined)
 *
 * - `paidAt` — timestamp when the gateway confirmed the payment (null if pending/failed)
 */
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: "pending" | "success" | "failed";
  paidAt: Date | null;
  createdAt: Date;
}

/** Creates a new Payment in "pending" status. */
export function createPayment(props: { orderId: string; amount: number }): Payment {
  return { id: crypto.randomUUID(), orderId: props.orderId, amount: props.amount, status: "pending", paidAt: null, createdAt: new Date() };
}
