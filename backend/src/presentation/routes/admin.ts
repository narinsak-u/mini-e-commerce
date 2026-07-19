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
