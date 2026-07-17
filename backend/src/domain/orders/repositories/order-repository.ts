import type { Order, OrderItem } from "../entities/order";
import type { OrderStatus } from "../../../shared/types";

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, page?: number, limit?: number): Promise<{ data: Order[]; total: number }>;
  findAll(page?: number, limit?: number, status?: OrderStatus): Promise<{ data: Order[]; total: number }>;
  save(order: Order): Promise<void>;
  saveItem(item: OrderItem): Promise<void>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
}
