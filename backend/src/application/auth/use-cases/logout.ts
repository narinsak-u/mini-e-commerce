// ponytail: skip refresh token persistence, add when refresh logout is needed
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Logs out by accepting (and ignoring) the refresh token.
 * ponytail: no server-side token invalidation yet.
 * Add a token blacklist in Redis when refresh-token logout is required.
 */
export function logoutUser() {
  return async (input: z.infer<typeof schema>) => {
    schema.parse(input);
    return { message: "Logged out successfully" };
  };
}
