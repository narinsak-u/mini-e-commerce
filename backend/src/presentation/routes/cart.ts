/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get cart contents
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart with items and total
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Cart" }
 *   delete:
 *     tags: [Cart]
 *     summary: Clear cart
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cart cleared
 * /cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Item added
 * /cart/items/{productId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update item quantity
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Quantity updated
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: productId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Item removed
 */
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

/** Cart routes — CRUD operations on Redis-backed cart. Requires authentication. */
export default router;
