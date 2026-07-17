import type { Notification } from "../entities/notification";

export interface INotificationRepository {
  findByUserId(userId: string, page?: number, limit?: number): Promise<{ data: Notification[]; total: number }>;
  save(notification: Notification): Promise<void>;
  markRead(id: string): Promise<void>;
}
