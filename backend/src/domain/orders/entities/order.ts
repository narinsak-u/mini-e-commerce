import type { OrderStatus } from "../../../shared/types";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export function createOrder(props: { userId: string; totalAmount: number }): Order {
  return { id: crypto.randomUUID(), userId: props.userId, status: "pending", totalAmount: props.totalAmount, items: [], createdAt: new Date(), updatedAt: new Date() };
}

export function createOrderItem(props: { orderId: string; productId: string; productName: string; productPrice: number; quantity: number }): OrderItem {
  return { id: crypto.randomUUID(), orderId: props.orderId, productId: props.productId, productName: props.productName, productPrice: props.productPrice, quantity: props.quantity, subtotal: props.productPrice * props.quantity };
}
