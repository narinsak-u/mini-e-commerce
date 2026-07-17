import type { Request, Response, NextFunction } from "express";
import { listNotificationsUseCase } from "../../application/notifications/use-cases/list-notifications";
import { markNotificationReadUseCase } from "../../application/notifications/use-cases/mark-read";

export function createNotificationController(
  list: ReturnType<typeof listNotificationsUseCase>,
  markRead: ReturnType<typeof markNotificationReadUseCase>,
) {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try { res.json(await list(req.user!.sub, Number(req.query.page) || 1, Number(req.query.limit) || 20)); }
      catch (err) { next(err); }
    },
    async markRead(req: Request, res: Response, next: NextFunction) {
      try { await markRead(req.params.id as string); res.status(204).send(); }
      catch (err) { next(err); }
    },
  };
}
