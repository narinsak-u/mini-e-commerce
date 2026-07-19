import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { createCategoryUseCase } from "../../application/categories/use-cases/create-category";
import { updateCategoryUseCase } from "../../application/categories/use-cases/update-category";
import { deleteCategoryUseCase } from "../../application/categories/use-cases/delete-category";
import { listCategoriesUseCase } from "../../application/categories/use-cases/list-categories";
import { cacheService } from "../../infrastructure/redis/cache-service";

import { z } from "zod";

/** Zod schema matching list-categories use-case input. */
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
const CACHE_KEY = "categories:all";
const CACHE_TTL = 600;

/** Category CRUD endpoints. */
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
      const params = listQuerySchema.parse(req.query);
      const result = await list(params);
      await cacheService.set(CACHE_KEY, result, CACHE_TTL);
      res.json(result);
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      const result = await update(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, req.body);
      await cacheService.del(CACHE_KEY);
      res.json(result);
    }),
    delete: asyncHandler(async (req: Request, res: Response) => {
      await del(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
      await cacheService.del(CACHE_KEY);
      res.status(204).send();
    }),
  };
}
