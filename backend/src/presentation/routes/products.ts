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

export default router;
