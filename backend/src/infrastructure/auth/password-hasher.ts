import bcrypt from "bcryptjs";
import type { IPasswordHasher } from "../../application/auth/interfaces/password-hasher";

/** bcrypt password hasher with cost factor 12. */
export function createPasswordHasher(): IPasswordHasher {
  return {
    async hash(password: string): Promise<string> {
      return bcrypt.hash(password, 12);
    },
    async compare(password: string, hash: string): Promise<boolean> {
      return bcrypt.compare(password, hash);
    },
  };
}
