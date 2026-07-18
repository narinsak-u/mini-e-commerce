import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getOrderUseCase } from "../../application/orders/use-cases/get-order";
import { listUserOrdersUseCase } from "../../application/orders/use-cases/list-user-orders";
import { updateOrderStatusUseCase } from "../../application/orders/use-cases/update-order-status";
import { cancelOrderUseCase } from "../../application/orders/use-cases/cancel-order";

export function createOrderController(
  get: ReturnType<typeof getOrderUseCase>,
  list: ReturnType<typeof listUserOrdersUseCase>,
  updateStatus: ReturnType<typeof updateOrderStatusUseCase>,
  cancel: ReturnType<typeof cancelOrderUseCase>,
) {
  return {
    getById: asyncHandler(async (req: Request, res: Response) => {
      res.json(await get(req.params.id));
    }),
    listMyOrders: asyncHandler(async (req: Request, res: Response) => {
      res.json(await list(req.user!.sub, Number(req.query.page) || 1, Number(req.query.limit) || 10));
    }),
    updateStatus: asyncHandler(async (req: Request, res: Response) => {
      res.json(await updateStatus(req.params.id, req.body));
    }),
    cancelOrder: asyncHandler(async (req: Request, res: Response) => {
      res.json(await cancel(req.params.id, req.user!.sub));
    }),
  };
}
