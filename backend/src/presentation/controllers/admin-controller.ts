import type { Request, Response, NextFunction } from "express";
import { getDashboardUseCase } from "../../application/admin/use-cases/get-dashboard";
import { listUsersUseCase } from "../../application/admin/use-cases/list-users";
import { updateUserRoleUseCase } from "../../application/admin/use-cases/update-user-role";
import { createAnalyticsStore } from "../../infrastructure/redis/analytics-store";
import { createDrizzleOrderRepo } from "../../infrastructure/database/repositories/drizzle-order-repo";
import { createDrizzleProductRepo } from "../../infrastructure/database/repositories/drizzle-product-repo";
import { createDrizzleUserRepo } from "../../infrastructure/database/repositories/drizzle-user-repo";

export function createAdminController() {
  const orderRepo = createDrizzleOrderRepo();
  const productRepo = createDrizzleProductRepo();
  const userRepo = createDrizzleUserRepo();
  const analytics = createAnalyticsStore();
  const dashboard = getDashboardUseCase(orderRepo, productRepo, userRepo);
  const listUsers = listUsersUseCase(userRepo);
  const updateRole = updateUserRoleUseCase(userRepo);

  return {
    async dashboard(req: Request, res: Response, next: NextFunction) {
      try { res.json(await dashboard()); }
      catch (err) { next(err); }
    },
    async analytics(req: Request, res: Response, next: NextFunction) {
      try { res.json(await analytics.getAnalytics()); }
      catch (err) { next(err); }
    },
    async users(req: Request, res: Response, next: NextFunction) {
      try { res.json(await listUsers()); }
      catch (err) { next(err); }
    },
    async updateUserRole(req: Request, res: Response, next: NextFunction) {
      try { res.json(await updateRole(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  };
}
