export type Role = "customer" | "admin";

export type OrderStatus =
  | "pending"
  | "paid"
  | "packing"
  | "shipping"
  | "completed"
  | "cancelled";
