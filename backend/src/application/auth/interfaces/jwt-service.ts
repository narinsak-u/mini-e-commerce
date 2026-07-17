/** Payload contained in JWT tokens. */
export interface TokenPayload {
  sub: string;
  role: string;
}

/** Service interface for JWT signing and verification. */
export interface IJwtService {
  signAccessToken(payload: TokenPayload): string;
  signRefreshToken(payload: TokenPayload): string;
  verify(token: string): TokenPayload;
}
