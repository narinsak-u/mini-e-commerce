import { pgTable, uuid, varchar, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { products } from "./products";

/** Drizzle schema for order_items table (line items). */
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: uuid("product_id").notNull().references(() => products.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productPrice: numeric("product_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
