import type { Request, Response, NextFunction } from "express";
import { createOrderUseCase } from "../../application/orders/use-cases/create-order";

export function createCheckoutController(createOrder: ReturnType<typeof createOrderUseCase>) {
  return {
    async checkout(req: Request, res: Response, next: NextFunction) {
      try { res.status(201).json(await createOrder(req.user!.sub)); }
      catch (err) { next(err); }
    },
  };
}
