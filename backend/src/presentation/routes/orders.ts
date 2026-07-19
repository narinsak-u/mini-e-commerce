/**
 * @openapi
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List current user orders
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Paginated order list
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/PaginatedOrders" }
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order details
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order detail with items
 *   patch:
 *     tags: [Orders]
 *     summary: Update order status (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order updated
 * /orders/{id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel own order (customer, pending only)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Only pending orders can be cancelled
 *       403:
 *         description: Not your order
 */
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
