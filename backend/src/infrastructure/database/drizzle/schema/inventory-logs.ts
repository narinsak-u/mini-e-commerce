import { pgTable, uuid, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { products } from "./products";
import { orders } from "./orders";

export const inventoryLogs = pgTable("inventory_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  quantityChange: integer("quantity_change").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
