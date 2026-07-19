/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List products with search, filter, pagination
 *     parameters:
 *       - name: page
 *         in: query
 *         schema: { type: integer, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, default: 10 }
 *       - name: q
 *         in: query
 *         schema: { type: string }
 *       - name: categoryId
 *         in: query
 *         schema: { type: string }
 *       - name: sortBy
 *         in: query
 *         schema: { type: string, enum: [price, createdAt] }
 *       - name: sortOrder
 *         in: query
 *         schema: { type: string, enum: [asc, desc] }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/PaginatedProducts" }
 *   post:
 *     tags: [Products]
 *     summary: Create product (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Product created
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product detail
 *   patch:
 *     tags: [Products]
 *     summary: Update product (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     tags: [Products]
 *     summary: Soft-delete product (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Product deleted
 */
import { Router } from "express";
import { createDrizzleProductRepo } from "../../infrastructure/database/repositories/drizzle-product-repo";
import { createProductUseCase } from "../../application/products/use-cases/create-product";
import { updateProductUseCase } from "../../application/products/use-cases/update-product";
import { deleteProductUseCase } from "../../application/products/use-cases/delete-product";
import { getProductUseCase } from "../../application/products/use-cases/get-product";
import { listProductsUseCase } from "../../application/products/use-cases/list-products";
import { createProductController } from "../controllers/product-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

const repo = createDrizzleProductRepo();
const controller = createProductController(
  createProductUseCase(repo), listProductsUseCase(repo), getProductUseCase(repo), updateProductUseCase(repo), deleteProductUseCase(repo),
);

const router = Router();
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.post("/", authMiddleware, rbacMiddleware("admin"), controller.create);
router.patch("/:id", authMiddleware, rbacMiddleware("admin"), controller.update);
router.delete("/:id", authMiddleware, rbacMiddleware("admin"), controller.delete);

/** Product routes — public list/detail, admin-only write operations. */
export default router;
