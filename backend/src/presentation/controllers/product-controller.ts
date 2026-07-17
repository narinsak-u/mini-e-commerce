import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { createProductUseCase } from "../../application/products/use-cases/create-product";
import { updateProductUseCase } from "../../application/products/use-cases/update-product";
import { deleteProductUseCase } from "../../application/products/use-cases/delete-product";
import { getProductUseCase } from "../../application/products/use-cases/get-product";
import { listProductsUseCase } from "../../application/products/use-cases/list-products";
import { ValidationError } from "../../shared/errors/app-error";

export function createProductController(
  create: ReturnType<typeof createProductUseCase>,
  list: ReturnType<typeof listProductsUseCase>,
  get: ReturnType<typeof getProductUseCase>,
  update: ReturnType<typeof updateProductUseCase>,
  del: ReturnType<typeof deleteProductUseCase>,
) {
  return {
    async create(req: Request, res: Response, next: NextFunction) {
      try { res.status(201).json(await create(req.body)); }
      catch (err) { if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", "))); next(err); }
    },
    async list(req: Request, res: Response, next: NextFunction) {
      try { res.json(await list(req.query)); }
      catch (err) { next(err); }
    },
    async getById(req: Request, res: Response, next: NextFunction) {
      try { res.json(await get(req.params.id)); }
      catch (err) { next(err); }
    },
    async update(req: Request, res: Response, next: NextFunction) {
      try { res.json(await update(req.params.id, req.body)); }
      catch (err) { if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", "))); next(err); }
    },
    async delete(req: Request, res: Response, next: NextFunction) {
      try { await del(req.params.id); res.status(204).send(); }
      catch (err) { next(err); }
    },
  };
}
