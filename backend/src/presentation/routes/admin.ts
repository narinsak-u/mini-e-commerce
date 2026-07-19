/**
 * @openapi
 * /admin/analytics:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard analytics (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Analytics data
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Analytics" }
 * /admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     summary: Get dashboard overview (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard data
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: List all users (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User list
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     summary: Update user role (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Role updated
 */
import { Router } from "express";
import { createAdminController } from "../controllers/admin-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

const controller = createAdminController();

const router = Router();
router.use(authMiddleware, rbacMiddleware("admin"));
router.get("/dashboard", controller.dashboard);
router.get("/analytics", controller.analytics);
router.get("/users", controller.users);
router.patch("/users/:id/role", controller.updateUserRole);

/** Admin routes — dashboard, analytics, users. Protected by auth + rbac middleware. */
export default router;
