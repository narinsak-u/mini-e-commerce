import { eq, desc, count } from "drizzle-orm";
import { db } from "../../../config/database";
import { notifications } from "../drizzle/schema/notifications";
import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";
import type { Notification } from "../../../domain/notifications/entities/notification";

export function createDrizzleNotificationRepo(): INotificationRepository {
  return {
    async findByUserId(userId: string, page = 1, limit = 20) {
      const offset = (page - 1) * limit;
      const [rows, totalResult] = await Promise.all([
        db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit).offset(offset),
        db.select({ value: count() }).from(notifications).where(eq(notifications.userId, userId)),
      ]);
      const data = rows.map(r => ({ id: r.id, userId: r.userId, type: r.type as Notification["type"], title: r.title, body: r.body, read: r.read, createdAt: r.createdAt }));
      return { data, total: Number(totalResult[0].value) };
    },
    async save(notification: Notification): Promise<void> {
      await db.insert(notifications).values({ id: notification.id, userId: notification.userId, type: notification.type, title: notification.title, body: notification.body, read: notification.read, createdAt: notification.createdAt });
    },
    async markRead(id: string): Promise<void> {
      await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
    },
  };
}
