import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { addCartItem } from "../../application/cart/use-cases/add-item";
import { getCart } from "../../application/cart/use-cases/get-cart";
import { updateCartItem } from "../../application/cart/use-cases/update-item";
import { removeCartItem } from "../../application/cart/use-cases/remove-item";
import { clearCart } from "../../application/cart/use-cases/clear-cart";
import { ValidationError } from "../../shared/errors/app-error";

export function createCartController(
  add: ReturnType<typeof addCartItem>,
  get: ReturnType<typeof getCart>,
  update: ReturnType<typeof updateCartItem>,
  remove: ReturnType<typeof removeCartItem>,
  clear: ReturnType<typeof clearCart>,
) {
  return {
    async getCart(req: Request, res: Response, next: NextFunction) {
      try { res.json(await get(req.user!.sub)); }
      catch (err) { next(err); }
    },
    async addItem(req: Request, res: Response, next: NextFunction) {
      try { res.json(await add(req.user!.sub, req.body)); }
      catch (err) { if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", "))); next(err); }
    },
    async updateItem(req: Request, res: Response, next: NextFunction) {
      try { res.json(await update(req.user!.sub, req.params.productId, req.body)); }
      catch (err) { if (err instanceof ZodError) return next(new ValidationError(err.errors.map(e => e.message).join(", "))); next(err); }
    },
    async removeItem(req: Request, res: Response, next: NextFunction) {
      try { res.json(await remove(req.user!.sub, req.params.productId)); }
      catch (err) { next(err); }
    },
    async clearCart(req: Request, res: Response, next: NextFunction) {
      try { res.json(await clear(req.user!.sub)); }
      catch (err) { next(err); }
    },
  };
}
