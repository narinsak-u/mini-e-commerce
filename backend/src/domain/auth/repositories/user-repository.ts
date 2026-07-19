import type { User } from "../entities/user";

/** Repository interface for User persistence. Implemented in infrastructure layer. */
export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  updateRole(id: string, role: "customer" | "admin"): Promise<void>;
  findAll(page: number, limit: number): Promise<{ data: User[]; total: number }>;
}
