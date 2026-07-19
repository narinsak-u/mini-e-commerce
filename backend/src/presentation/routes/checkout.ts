/**
 * @openapi
 * /checkout:
 *   post:
 *     tags: [Checkout]
 *     summary: Create order from cart and publish order.created event
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Order" }
 *       400:
 *         description: Cart is empty
 */
import { Router } from "express";
import { createDrizzleOrderRepo } from "../../infrastructure/database/repositories/drizzle-order-repo";
import { createRedisCartRepo } from "../../infrastructure/redis/cart-repository";
import { createOrderUseCase } from "../../application/orders/use-cases/create-order";
import { createCheckoutController } from "../controllers/checkout-controller";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);
router.post("/", createCheckoutController(createOrderUseCase(createDrizzleOrderRepo(), createRedisCartRepo())).checkout);
/** Checkout route — creates order from cart. Requires authentication. */
export default router;
