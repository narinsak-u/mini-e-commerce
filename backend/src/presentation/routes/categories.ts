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

export default router;
