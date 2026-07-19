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
