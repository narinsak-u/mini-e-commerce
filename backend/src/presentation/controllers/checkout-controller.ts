import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { createOrderUseCase } from "../../application/orders/use-cases/create-order";

/** Checkout endpoint — creates order from cart. */
export function createCheckoutController(createOrder: ReturnType<typeof createOrderUseCase>) {
  return {
    checkout: asyncHandler(async (req: Request, res: Response) => {
      res.status(201).json(await createOrder(req.user!.sub));
    }),
  };
}
