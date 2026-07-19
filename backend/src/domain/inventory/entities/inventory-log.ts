/**
 * Represents a stock movement log entry.
 *
 * **Type semantics:**
 * - `"reserve"` — stock deducted for an order
 * - `"release"` — stock restored on cancellation/failure
 * - `"restock"` — stock added by admin
 *
 * Every inventory mutation writes a log for audit trail.
 */
export interface InventoryLog {
  id: string;
  productId: string;
  orderId: string;
  quantityChange: number;
  type: "reserve" | "release" | "restock";
  createdAt: Date;
}

/** Creates an InventoryLog entry. `quantityChange` is positive for release/restock, negative for reserve. */
export function createInventoryLog(props: { productId: string; orderId: string; quantityChange: number; type: "reserve" | "release" | "restock" }): InventoryLog {
  return { id: crypto.randomUUID(), productId: props.productId, orderId: props.orderId, quantityChange: props.quantityChange, type: props.type, createdAt: new Date() };
}
