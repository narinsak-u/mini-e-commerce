import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { getDashboardUseCase } from "../../application/admin/use-cases/get-dashboard";
import { listUsersUseCase } from "../../application/admin/use-cases/list-users";
import { updateUserRoleUseCase } from "../../application/admin/use-cases/update-user-role";
import { createAnalyticsStore } from "../../infrastructure/redis/analytics-store";
import { createDrizzleOrderRepo } from "../../infrastructure/database/repositories/drizzle-order-repo";
import { createDrizzleProductRepo } from "../../infrastructure/database/repositories/drizzle-product-repo";
import { createDrizzleUserRepo } from "../../infrastructure/database/repositories/drizzle-user-repo";

/** Admin dashboard and user management endpoints. */
export function createAdminController() {
  const orderRepo = createDrizzleOrderRepo();
  const productRepo = createDrizzleProductRepo();
  const userRepo = createDrizzleUserRepo();
  const analytics = createAnalyticsStore();
  const dashboard = getDashboardUseCase(orderRepo, productRepo, userRepo);
  const listUsers = listUsersUseCase(userRepo);
  const updateRole = updateUserRoleUseCase(userRepo);

  return {
    dashboard: asyncHandler(async (_req: Request, res: Response) => {
      res.json(await dashboard());
    }),
    analytics: asyncHandler(async (_req: Request, res: Response) => {
      res.json(await analytics.getAnalytics());
    }),
    users: asyncHandler(async (_req: Request, res: Response) => {
      res.json(await listUsers());
    }),
    updateUserRole: asyncHandler(async (req: Request, res: Response) => {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      res.json(await updateRole(id, req.body));
    }),
  };
}
