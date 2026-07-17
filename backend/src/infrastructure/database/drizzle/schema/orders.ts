import { pgTable, uuid, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "packing", "shipping", "completed", "cancelled"]);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").default("pending").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
