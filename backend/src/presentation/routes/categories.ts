/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: List all categories
 *     responses:
 *       200:
 *         description: Category list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/Category" }
 *   post:
 *     tags: [Categories]
 *     summary: Create category (admin)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Category created
 * /categories/{id}:
 *   patch:
 *     tags: [Categories]
 *     summary: Update category (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Category updated
 *   delete:
 *     tags: [Categories]
 *     summary: Delete category (admin)
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Category deleted
 */
import { Router } from "express";
import { createDrizzleCategoryRepo } from "../../infrastructure/database/repositories/drizzle-category-repo";
import { createCategoryUseCase } from "../../application/categories/use-cases/create-category";
import { updateCategoryUseCase } from "../../application/categories/use-cases/update-category";
import { deleteCategoryUseCase } from "../../application/categories/use-cases/delete-category";
import { listCategoriesUseCase } from "../../application/categories/use-cases/list-categories";
import { createCategoryController } from "../controllers/category-controller";
import { authMiddleware } from "../middleware/auth";
import { rbacMiddleware } from "../middleware/rbac";

const repo = createDrizzleCategoryRepo();
const create = createCategoryUseCase(repo);
const list = listCategoriesUseCase(repo);
const update = updateCategoryUseCase(repo);
const del = deleteCategoryUseCase(repo);
const controller = createCategoryController(create, list, update, del);

const router = Router();

router.get("/", controller.list);
router.post("/", authMiddleware, rbacMiddleware("admin"), controller.create);
router.patch("/:id", authMiddleware, rbacMiddleware("admin"), controller.update);
router.delete("/:id", authMiddleware, rbacMiddleware("admin"), controller.delete);

/** Category routes — public list, admin-only write operations. */
export default router;
