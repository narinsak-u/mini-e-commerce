/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List user notifications
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Paginated notification list
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/PaginatedNotifications" }
 * /notifications/{id}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marked as read
 */
import { Router } from "express";
import { createDrizzleNotificationRepo } from "../../infrastructure/database/repositories/drizzle-notification-repo";
import { listNotificationsUseCase } from "../../application/notifications/use-cases/list-notifications";
import { markNotificationReadUseCase } from "../../application/notifications/use-cases/mark-read";
import { createNotificationController } from "../controllers/notification-controller";
import { authMiddleware } from "../middleware/auth";

const repo = createDrizzleNotificationRepo();
const controller = createNotificationController(listNotificationsUseCase(repo), markNotificationReadUseCase(repo));

const router = Router();
router.use(authMiddleware);
router.get("/", controller.list);
router.patch("/:id/read", controller.markRead);

/** Notification routes — list and mark-as-read. Requires authentication. */
export default router;
