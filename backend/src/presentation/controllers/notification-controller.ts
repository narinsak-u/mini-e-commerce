import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { listNotificationsUseCase } from "../../application/notifications/use-cases/list-notifications";
import { markNotificationReadUseCase } from "../../application/notifications/use-cases/mark-read";

/** Notification listing and mark-as-read endpoints. */
export function createNotificationController(
  list: ReturnType<typeof listNotificationsUseCase>,
  markRead: ReturnType<typeof markNotificationReadUseCase>,
) {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      res.json(await list(req.user!.sub, Number(req.query.page) || 1, Number(req.query.limit) || 20));
    }),
    markRead: asyncHandler(async (req: Request, res: Response) => {
      await markRead(req.params.id as string);
      res.status(204).send();
    }),
  };
}
