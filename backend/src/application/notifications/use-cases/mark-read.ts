import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";

/** Marks a single notification as read. */
export function markNotificationReadUseCase(repo: INotificationRepository) {
  return async (id: string) => { await repo.markRead(id); };
}
