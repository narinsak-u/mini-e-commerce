import type { OrderStatus } from "../../../shared/types";

/**
 * Represents a customer order.
 *
 * **Status lifecycle:**
 * `pending → paid → packing → shipping → completed`
 * `pending → cancelled` (on payment failure or customer request)
 *
 * **Properties:**
 * - `items` — line items with product name, quantity, price snapshot
 * - `totalAmount` — sum of all item subtotals at time of order
 */
export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

/** Creates a new Order entity with status "pending" and empty items array. */
export function createOrder(props: { userId: string; totalAmount: number }): Order {
  return {
    id: crypto.randomUUID(),
    userId: props.userId,
    status: "pending",
    totalAmount: props.totalAmount,
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Creates an OrderItem linked to an order, with computed subtotal. */
export function createOrderItem(props: {
  orderId: string; productId: string; productName: string;
  productPrice: number; quantity: number;
}): OrderItem {
  return {
    id: crypto.randomUUID(),
    orderId: props.orderId,
    productId: props.productId,
    productName: props.productName,
    productPrice: props.productPrice,
    quantity: props.quantity,
    subtotal: props.productPrice * props.quantity,
  };
}
