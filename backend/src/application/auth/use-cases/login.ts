import { z } from "zod";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { IJwtService } from "../interfaces/jwt-service";
import type { IPasswordHasher } from "../interfaces/password-hasher";
import { UnauthorizedError } from "../../../shared/errors/app-error";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
