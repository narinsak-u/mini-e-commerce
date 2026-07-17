import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { createProductUseCase } from "../../application/products/use-cases/create-product";
import { updateProductUseCase } from "../../application/products/use-cases/update-product";
import { deleteProductUseCase } from "../../application/products/use-cases/delete-product";
import { getProductUseCase } from "../../application/products/use-cases/get-product";
import { listProductsUseCase } from "../../application/products/use-cases/list-products";
import { createCacheService } from "../../infrastructure/redis/cache-service";
import { ValidationError } from "../../shared/errors/app-error";

export function createProductController(
  create: ReturnType<typeof createProductUseCase>,
  list: ReturnType<typeof listProductsUseCase>,
  get: ReturnType<typeof getProductUseCase>,
  update: ReturnType<typeof updateProductUseCase>,
  del: ReturnType<typeof deleteProductUseCase>,
) {
  const cache = createCacheService();
  const PRODUCT_CACHE_TTL = 300;

  return {
    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await create(req.body);
        await cache.delPattern("products:*");
        res.status(201).json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", ")));
        next(err);
      }
    },
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const cacheKey = `products:list:${JSON.stringify(req.query)}`;
        const cached = await cache.get(cacheKey);
        if (cached) { res.json(cached); return; }
        const result = await list(req.query);
        await cache.set(cacheKey, result, PRODUCT_CACHE_TTL);
        res.json(result);
      } catch (err) { next(err); }
    },
    async getById(req: Request, res: Response, next: NextFunction) {
      try {
        const cacheKey = `products:${req.params.id}`;
        const cached = await cache.get(cacheKey);
        if (cached) { res.json(cached); return; }
        const result = await get(req.params.id);
        await cache.set(cacheKey, result, PRODUCT_CACHE_TTL);
        res.json(result);
      } catch (err) { next(err); }
    },
    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await update(req.params.id, req.body);
        await cache.delPattern("products:*");
        res.json(result);
      } catch (err) {
        if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", ")));
        next(err);
      }
    },
    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        await del(req.params.id);
        await cache.delPattern("products:*");
        res.status(204).send();
      } catch (err) { next(err); }
    },
  };
}
