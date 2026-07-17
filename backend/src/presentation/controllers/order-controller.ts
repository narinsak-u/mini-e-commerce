import type { Request, Response, NextFunction } from "express";
import { getOrderUseCase } from "../../application/orders/use-cases/get-order";
import { listUserOrdersUseCase } from "../../application/orders/use-cases/list-user-orders";
import { updateOrderStatusUseCase } from "../../application/orders/use-cases/update-order-status";

export function createOrderController(
  get: ReturnType<typeof getOrderUseCase>,
  list: ReturnType<typeof listUserOrdersUseCase>,
  updateStatus: ReturnType<typeof updateOrderStatusUseCase>,
) {
  return {
    async getById(req: Request, res: Response, next: NextFunction) {
      try { res.json(await get(req.params.id)); }
      catch (err) { next(err); }
    },
    async listMyOrders(req: Request, res: Response, next: NextFunction) {
      try { res.json(await list(req.user!.sub, Number(req.query.page) || 1, Number(req.query.limit) || 10)); }
      catch (err) { next(err); }
    },
    async updateStatus(req: Request, res: Response, next: NextFunction) {
      try { res.json(await updateStatus(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  };
}
