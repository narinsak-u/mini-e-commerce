import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { addCartItem } from "../../application/cart/use-cases/add-item";
import { getCart } from "../../application/cart/use-cases/get-cart";
import { updateCartItem } from "../../application/cart/use-cases/update-item";
import { removeCartItem } from "../../application/cart/use-cases/remove-item";
import { clearCart } from "../../application/cart/use-cases/clear-cart";

/** Shopping cart CRUD endpoints (Redis-backed). */
export function createCartController(
  add: ReturnType<typeof addCartItem>,
  get: ReturnType<typeof getCart>,
  update: ReturnType<typeof updateCartItem>,
  remove: ReturnType<typeof removeCartItem>,
  clear: ReturnType<typeof clearCart>,
) {
  return {
    getCart: asyncHandler(async (req: Request, res: Response) => {
      res.json(await get(req.user!.sub));
    }),
    addItem: asyncHandler(async (req: Request, res: Response) => {
      res.json(await add(req.user!.sub, req.body));
    }),
    updateItem: asyncHandler(async (req: Request, res: Response) => {
      const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
      res.json(await update(req.user!.sub, productId, req.body));
    }),
    removeItem: asyncHandler(async (req: Request, res: Response) => {
      const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
      res.json(await remove(req.user!.sub, productId));
    }),
    clearCart: asyncHandler(async (req: Request, res: Response) => {
      res.json(await clear(req.user!.sub));
    }),
  };
}
