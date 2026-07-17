import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";

export function markNotificationReadUseCase(repo: INotificationRepository) {
  return async (id: string) => { await repo.markRead(id); };
}
