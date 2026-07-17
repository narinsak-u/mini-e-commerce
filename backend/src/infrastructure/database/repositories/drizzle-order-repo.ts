import { eq, desc, count, and } from "drizzle-orm";
import { db } from "../../../config/database";
import { orders } from "../drizzle/schema/orders";
import { orderItems } from "../drizzle/schema/order-items";
import type { IOrderRepository } from "../../../domain/orders/repositories/order-repository";
import type { Order, OrderItem } from "../../../domain/orders/entities/order";
import type { OrderStatus } from "../../../shared/types";

export function createDrizzleOrderRepo(): IOrderRepository {
  return {
    async findById(id: string): Promise<Order | null> {
      const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!rows[0]) return null;
      const itemRows = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
      return rowToOrder(rows[0], itemRows);
    },
    async findByUserId(userId: string, page = 1, limit = 10) {
      const offset = (page - 1) * limit;
      const [rows, totalResult] = await Promise.all([
        db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(orders).where(eq(orders.userId, userId)),
      ]);
      const data = await Promise.all(rows.map(async r => { const items = await db.select().from(orderItems).where(eq(orderItems.orderId, r.id)); return rowToOrder(r, items); }));
      return { data, total: Number(totalResult[0].value) };
    },
    async findAll(page = 1, limit = 10, status?: OrderStatus) {
      const offset = (page - 1) * limit;
      const conditions = status ? [eq(orders.status, status)] : [];
      const [rows, totalResult] = await Promise.all([
        db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(orders).where(and(...conditions)),
      ]);
      const data = await Promise.all(rows.map(async r => { const items = await db.select().from(orderItems).where(eq(orderItems.orderId, r.id)); return rowToOrder(r, items); }));
      return { data, total: Number(totalResult[0].value) };
    },
    async save(order: Order) {
      await db.insert(orders).values({ id: order.id, userId: order.userId, status: order.status, totalAmount: String(order.totalAmount), createdAt: order.createdAt, updatedAt: order.updatedAt });
    },
    async saveItem(item: OrderItem) {
      await db.insert(orderItems).values({ id: item.id, orderId: item.orderId, productId: item.productId, productName: item.productName, productPrice: String(item.productPrice), quantity: item.quantity, subtotal: String(item.subtotal), createdAt: new Date() });
    },
    async updateStatus(id: string, status: OrderStatus) {
      await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
    },
  };
}

function rowToOrder(r: typeof orders.$inferSelect, items: (typeof orderItems.$inferSelect)[]): Order {
  return {
    id: r.id, userId: r.userId, status: r.status as OrderStatus, totalAmount: Number(r.totalAmount),
    items: items.map(i => ({ id: i.id, orderId: i.orderId, productId: i.productId, productName: i.productName, productPrice: Number(i.productPrice), quantity: i.quantity, subtotal: Number(i.subtotal) })),
    createdAt: r.createdAt, updatedAt: r.updatedAt,
  };
}
