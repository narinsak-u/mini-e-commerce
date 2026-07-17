import { z } from "zod";
import type { IUserRepository } from "../../../domain/auth/repositories/user-repository";
import type { IJwtService } from "../interfaces/jwt-service";
import { UnauthorizedError } from "../../../shared/errors/app-error";

const schema = z.object({
  refreshToken: z.string().min(1),
});

export function refreshToken(userRepo: IUserRepository, jwt: IJwtService) {
  return async (input: z.infer<typeof schema>) => {
    const data = schema.parse(input);

    let payload;
    try {
      payload = jwt.verify(data.refreshToken);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await userRepo.findById(payload.sub);
    if (!user) throw new UnauthorizedError("User not found");

    const accessToken = jwt.signAccessToken({ sub: user.id, role: user.role });
    const newRefreshToken = jwt.signRefreshToken({ sub: user.id, role: user.role });

    return { accessToken, refreshToken: newRefreshToken };
  };
}
