import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { createProductUseCase } from "../../application/products/use-cases/create-product";
import { updateProductUseCase } from "../../application/products/use-cases/update-product";
import { deleteProductUseCase } from "../../application/products/use-cases/delete-product";
import { getProductUseCase } from "../../application/products/use-cases/get-product";
import { listProductsUseCase } from "../../application/products/use-cases/list-products";
import { cacheService } from "../../infrastructure/redis/cache-service";

const PRODUCT_CACHE_TTL = 300;

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
      const result = await list(req.query);
      await cacheService.set(cacheKey, result, PRODUCT_CACHE_TTL);
      res.json(result);
    }),
    getById: asyncHandler(async (req: Request, res: Response) => {
      const cacheKey = `products:${req.params.id}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) { res.json(cached); return; }
      const result = await get(req.params.id);
      await cacheService.set(cacheKey, result, PRODUCT_CACHE_TTL);
      res.json(result);
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      const result = await update(req.params.id, req.body);
      await cacheService.delPattern("products:*");
      res.json(result);
    }),
    delete: asyncHandler(async (req: Request, res: Response) => {
      await del(req.params.id);
      await cacheService.delPattern("products:*");
      res.status(204).send();
    }),
  };
}
