export interface Notification {
  id: string;
  userId: string;
  type: "order_confirmed" | "payment_success" | "shipping" | "delivered" | "order_cancelled";
  title: string;
  body: string | null;
  read: boolean;
  createdAt: Date;
}

export function createNotification(props: { userId: string; type: Notification["type"]; title: string; body?: string }): Notification {
  return { id: crypto.randomUUID(), userId: props.userId, type: props.type, title: props.title, body: props.body ?? null, read: false, createdAt: new Date() };
}
