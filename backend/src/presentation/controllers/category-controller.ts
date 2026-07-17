import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { createCategoryUseCase } from "../../application/categories/use-cases/create-category";
import { updateCategoryUseCase } from "../../application/categories/use-cases/update-category";
import { deleteCategoryUseCase } from "../../application/categories/use-cases/delete-category";
import { listCategoriesUseCase } from "../../application/categories/use-cases/list-categories";
import { ValidationError } from "../../shared/errors/app-error";

export interface CategoryController {
  create(req: Request, res: Response, next: NextFunction): Promise<void>;
  list(req: Request, res: Response, next: NextFunction): Promise<void>;
  update(req: Request, res: Response, next: NextFunction): Promise<void>;
  delete(req: Request, res: Response, next: NextFunction): Promise<void>;
}

export function createCategoryController(
  create: ReturnType<typeof createCategoryUseCase>,
  list: ReturnType<typeof listCategoriesUseCase>,
  update: ReturnType<typeof updateCategoryUseCase>,
  del: ReturnType<typeof deleteCategoryUseCase>,
): CategoryController {
  return {
    async create(req, res, next) {
      try { const result = await create(req.body); res.status(201).json(result); }
      catch (err) { if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", "))); next(err); }
    },
    async list(req, res, next) {
      try { const result = await list(req.query); res.json(result); }
      catch (err) { next(err); }
    },
    async update(req, res, next) {
      try { const result = await update(req.params.id, req.body); res.json(result); }
      catch (err) { if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", "))); next(err); }
    },
    async delete(req, res, next) {
      try { await del(req.params.id); res.status(204).send(); }
      catch (err) { next(err); }
    },
  };
}
