import { eq } from "drizzle-orm";
import { db } from "../../../config/database";
import { users } from "../drizzle/schema/users";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { User } from "../../../domain/auth/entities/user";

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
