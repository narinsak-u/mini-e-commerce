export interface InventoryLog {
  id: string;
  productId: string;
  orderId: string;
  quantityChange: number;
  type: "reserve" | "release" | "restock";
  createdAt: Date;
}

export function createInventoryLog(props: { productId: string; orderId: string; quantityChange: number; type: "reserve" | "release" | "restock" }): InventoryLog {
  return { id: crypto.randomUUID(), productId: props.productId, orderId: props.orderId, quantityChange: props.quantityChange, type: props.type, createdAt: new Date() };
}
