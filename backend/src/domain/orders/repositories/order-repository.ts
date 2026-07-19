import type { Order, OrderItem } from "../entities/order";
import type { OrderStatus } from "../../shared/types";
import type { PaginatedResult } from "../../categories/repositories/category-repository";

/** Repository interface for Order + OrderItem persistence. */
export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, page: number, limit: number): Promise<PaginatedResult<Order>>;
  findAll(page: number, limit: number, status?: OrderStatus): Promise<PaginatedResult<Order>>;
  save(order: Order): Promise<void>;
  saveItem(item: OrderItem): Promise<void>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
}
