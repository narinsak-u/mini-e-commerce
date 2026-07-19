import { eq, count } from "drizzle-orm";
import { db } from "../../../config/database";
import { users } from "../drizzle/schema/users";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { User } from "../../../domain/auth/entities/user";

/** Drizzle implementation of IUserRepository. */
export function createDrizzleUserRepo(): IUserRepository {
  return {
    async findByEmail(email: string): Promise<User | null> {
      const row = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!row[0]) return null;
      return rowToUser(row[0]);
    },
    async findById(id: string): Promise<User | null> {
      const row = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (!row[0]) return null;
      return rowToUser(row[0]);
    },
    async save(user: User): Promise<void> {
      await db.insert(users).values({
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    },
    async updateRole(id: string, role: "customer" | "admin"): Promise<void> {
      await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
    },
    async findAll(page = 1, limit = 10) {
      const offset = (page - 1) * limit;
      const [rows, totalResult] = await Promise.all([
        db.select().from(users).limit(limit).offset(offset),
        db.select({ value: count() }).from(users),
      ]);
      return { data: rows.map(rowToUser), total: Number(totalResult[0].value) };
    },
  };
}

function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    name: row.name,
    role: row.role,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
