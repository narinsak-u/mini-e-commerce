export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: "pending" | "success" | "failed";
  paidAt: Date | null;
  createdAt: Date;
}

export function createPayment(props: { orderId: string; amount: number }): Payment {
  return { id: crypto.randomUUID(), orderId: props.orderId, amount: props.amount, status: "pending", paidAt: null, createdAt: new Date() };
}
