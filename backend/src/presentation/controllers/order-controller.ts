import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getOrderUseCase } from "../../application/orders/use-cases/get-order";
import { listUserOrdersUseCase } from "../../application/orders/use-cases/list-user-orders";
import { updateOrderStatusUseCase } from "../../application/orders/use-cases/update-order-status";
import { cancelOrderUseCase } from "../../application/orders/use-cases/cancel-order";

/** Order listing, detail, status update, and customer cancellation endpoints. */
export function createOrderController(
  get: ReturnType<typeof getOrderUseCase>,
  list: ReturnType<typeof listUserOrdersUseCase>,
  updateStatus: ReturnType<typeof updateOrderStatusUseCase>,
  cancel: ReturnType<typeof cancelOrderUseCase>,
) {
  return {
    getById: asyncHandler(async (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      res.json(await get(id));
    }),
    listMyOrders: asyncHandler(async (req: Request, res: Response) => {
      res.json(await list(req.user!.sub, Number(req.query.page) || 1, Number(req.query.limit) || 10));
    }),
    updateStatus: asyncHandler(async (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      res.json(await updateStatus(id, req.body));
    }),
    cancelOrder: asyncHandler(async (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      res.json(await cancel(id, req.user!.sub));
    }),
  };
}
