import type { INotificationRepository } from "../../../domain/notifications/repositories/notification-repository";

/** Paginated list of notifications for the authenticated user. */
export function listNotificationsUseCase(repo: INotificationRepository) {
  return async (userId: string, page = 1, limit = 20) => repo.findByUserId(userId, page, limit);
}
