import { z } from "zod";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { IJwtService } from "../interfaces/jwt-service";
import type { IPasswordHasher } from "../interfaces/password-hasher";
import { UnauthorizedError } from "../../../shared/errors/app-error";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Authenticates a user by email + password.
 * 1. Validates input with Zod
 * 2. Looks up user by email → 401 if not found
 * 3. Compares password hash → 401 if mismatch
 * 4. Returns access + refresh JWT tokens
 */
export function loginUser(userRepo: IUserRepository, hasher: IPasswordHasher, jwt: IJwtService) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const user = await userRepo.findByEmail(data.email);
    if (!user) throw new UnauthorizedError("Invalid email or password");

    const valid = await hasher.compare(data.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    const accessToken = jwt.signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = jwt.signRefreshToken({ sub: user.id, role: user.role });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    };
  };
}
