import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import type { IJwtService, TokenPayload } from "../../application/auth/interfaces/jwt-service";

export function createJwtService(): IJwtService {
  return {
    signAccessToken(payload: TokenPayload): string {
      return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
    },
    signRefreshToken(payload: TokenPayload): string {
      return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtRefreshExpiresIn });
    },
    verify(token: string): TokenPayload {
      return jwt.verify(token, env.jwtSecret) as TokenPayload;
    },
  };
}
