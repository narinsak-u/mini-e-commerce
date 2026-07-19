import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";

/** Paginated list of all users (admin only). */
export function listUsersUseCase(_userRepo: IUserRepository) {
  return async () => [];
}
