import { z } from "zod";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import { NotFoundError } from "../../../shared/errors/app-error";

const schema = z.object({ role: z.enum(["customer", "admin"]) });

/** Updates a user's role between customer and admin. */
export function updateUserRoleUseCase(userRepo: IUserRepository) {
  return async (id: string, input: z.infer<typeof schema>) => {
    const data = schema.parse(input);
    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError("User");
    await userRepo.save({ ...user, role: data.role });
    return { ...user, role: data.role };
  };
}
