import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import type { IJwtService, TokenPayload } from "../../application/auth/interfaces/jwt-service";

/** JWT implementation using jsonwebtoken. Signs with HS256 + configurable expiry. */
export function createJwtService(): IJwtService {
  return {
    signAccessToken(payload: TokenPayload): string {
      return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
    },
    signRefreshToken(payload: TokenPayload): string {
      return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtRefreshExpiresIn } as jwt.SignOptions);
    },
    verify(token: string): TokenPayload {
      return jwt.verify(token, env.jwtSecret) as TokenPayload;
    },
  };
}
