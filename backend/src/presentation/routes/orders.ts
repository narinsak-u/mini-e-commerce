import { Router } from "express";
import { createDrizzleOrderRepo } from "../../infrastructure/database/repositories/drizzle-order-repo";
import { getOrderUseCase } from "../../application/orders/use-cases/get-order";
import { listUserOrdersUseCase } from "../../application/orders/use-cases/list-user-orders";
import { updateOrderStatusUseCase } from "../../application/orders/use-cases/update-order-status";
import { cancelOrderUseCase } from "../../application/orders/use-cases/cancel-order";
import { createOrderController } from "../controllers/order-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

const repo = createDrizzleOrderRepo();
const controller = createOrderController(getOrderUseCase(repo), listUserOrdersUseCase(repo), updateOrderStatusUseCase(repo), cancelOrderUseCase(repo));

const router = Router();
router.use(authMiddleware);
router.get("/", controller.listMyOrders);
router.get("/:id", controller.getById);
router.patch("/:id", rbacMiddleware("admin"), controller.updateStatus);
router.post("/:id/cancel", controller.cancelOrder);

/** Order routes — list, detail, admin status update, customer cancel. Requires authentication. */
export default router;
