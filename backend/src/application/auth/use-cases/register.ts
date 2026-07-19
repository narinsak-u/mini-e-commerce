import { z } from "zod";
import { createUser } from "../../../domain/auth/entities/user";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { IJwtService } from "../interfaces/jwt-service";
import type { IPasswordHasher } from "../interfaces/password-hasher";
import { ValidationError } from "../../../shared/errors/app-error";

const schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(6).max(255),
});

/**
 * Registers a new user.
 * 1. Validates input with Zod (name, email, password ≥ 6 chars)
 * 2. Checks for duplicate email → 400 ValidationError
 * 3. Hashes password with bcrypt
 * 4. Saves user to PostgreSQL
 * 5. Returns access + refresh JWT tokens
 */
export function registerUser(userRepo: IUserRepository, hasher: IPasswordHasher, jwt: IJwtService) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    const existing = await userRepo.findByEmail(data.email);
    if (existing) throw new ValidationError("Email already in use");

    const passwordHash = await hasher.hash(data.password);
    const user = createUser({
      email: data.email,
      passwordHash,
      name: data.name,
    });

    await userRepo.save(user);

    const accessToken = jwt.signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = jwt.signRefreshToken({ sub: user.id, role: user.role });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    };
  };
}
