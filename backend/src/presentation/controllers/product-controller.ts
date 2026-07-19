import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { createProductUseCase } from "../../application/products/use-cases/create-product";
import { updateProductUseCase } from "../../application/products/use-cases/update-product";
import { deleteProductUseCase } from "../../application/products/use-cases/delete-product";
import { getProductUseCase } from "../../application/products/use-cases/get-product";
import { listProductsUseCase } from "../../application/products/use-cases/list-products";
import { cacheService } from "../../infrastructure/redis/cache-service";
import { z } from "zod";

const PRODUCT_CACHE_TTL = 300;

/** Zod schema matching list-products use-case input for query validation. */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  sortBy: z.enum(["price", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/** Product CRUD endpoints with search, filter, and pagination. */
export function createProductController(
  create: ReturnType<typeof createProductUseCase>,
  list: ReturnType<typeof listProductsUseCase>,
  get: ReturnType<typeof getProductUseCase>,
  update: ReturnType<typeof updateProductUseCase>,
  del: ReturnType<typeof deleteProductUseCase>,
) {
  return {
    create: asyncHandler(async (req: Request, res: Response) => {
      const result = await create(req.body);
      await cacheService.delPattern("products:*");
      res.status(201).json(result);
    }),
    list: asyncHandler(async (req: Request, res: Response) => {
      const cacheKey = `products:list:${JSON.stringify(req.query)}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) { res.json(cached); return; }
      const params = listQuerySchema.parse(req.query);
      const result = await list(params);
      await cacheService.set(cacheKey, result, PRODUCT_CACHE_TTL);
      res.json(result);
    }),
    getById: asyncHandler(async (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const cacheKey = `products:${id}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) { res.json(cached); return; }
      const result = await get(id);
      await cacheService.set(cacheKey, result, PRODUCT_CACHE_TTL);
      res.json(result);
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await update(id, req.body);
      await cacheService.delPattern("products:*");
      res.json(result);
    }),
    delete: asyncHandler(async (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await del(id);
      await cacheService.delPattern("products:*");
      res.status(204).send();
    }),
  };
}
