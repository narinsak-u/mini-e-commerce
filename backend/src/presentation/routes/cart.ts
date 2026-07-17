import { Router } from "express";
import { createRedisCartRepo } from "../../infrastructure/redis/cart-repository";
import { createDrizzleProductRepo } from "../../infrastructure/database/repositories/drizzle-product-repo";
import { addCartItem } from "../../application/cart/use-cases/add-item";
import { getCart } from "../../application/cart/use-cases/get-cart";
import { updateCartItem } from "../../application/cart/use-cases/update-item";
import { removeCartItem } from "../../application/cart/use-cases/remove-item";
import { clearCart } from "../../application/cart/use-cases/clear-cart";
import { createCartController } from "../controllers/cart-controller";
import { authMiddleware } from "../middleware/auth";

const cartRepo = createRedisCartRepo();
const productRepo = createDrizzleProductRepo();
const controller = createCartController(
  addCartItem(cartRepo, productRepo), getCart(cartRepo), updateCartItem(cartRepo),
  removeCartItem(cartRepo), clearCart(cartRepo),
);

const router = Router();
router.use(authMiddleware);
router.get("/", controller.getCart);
router.post("/items", controller.addItem);
router.patch("/items/:productId", controller.updateItem);
router.delete("/items/:productId", controller.removeItem);
router.delete("/", controller.clearCart);

export default router;
