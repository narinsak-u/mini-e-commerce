import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { createCategoryUseCase } from "../../application/categories/use-cases/create-category";
import { updateCategoryUseCase } from "../../application/categories/use-cases/update-category";
import { deleteCategoryUseCase } from "../../application/categories/use-cases/delete-category";
import { listCategoriesUseCase } from "../../application/categories/use-cases/list-categories";
import { cacheService } from "../../infrastructure/redis/cache-service";

const CACHE_KEY = "categories:all";
const CACHE_TTL = 600;

export function createCategoryController(
  create: ReturnType<typeof createCategoryUseCase>,
  list: ReturnType<typeof listCategoriesUseCase>,
  update: ReturnType<typeof updateCategoryUseCase>,
  del: ReturnType<typeof deleteCategoryUseCase>,
) {
  return {
    create: asyncHandler(async (req: Request, res: Response) => {
      const result = await create(req.body);
      await cacheService.del(CACHE_KEY);
      res.status(201).json(result);
    }),
    list: asyncHandler(async (req: Request, res: Response) => {
      const cached = await cacheService.get(CACHE_KEY);
      if (cached) { res.json(cached); return; }
      const result = await list(req.query);
      await cacheService.set(CACHE_KEY, result, CACHE_TTL);
      res.json(result);
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      const result = await update(req.params.id, req.body);
      await cacheService.del(CACHE_KEY);
      res.json(result);
    }),
    delete: asyncHandler(async (req: Request, res: Response) => {
      await del(req.params.id);
      await cacheService.del(CACHE_KEY);
      res.status(204).send();
    }),
  };
}
