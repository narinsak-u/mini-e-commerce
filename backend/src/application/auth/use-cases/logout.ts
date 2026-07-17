// ponytail: skip refresh token persistence, add when refresh logout is needed
import { z } from "zod";

const schema = z.object({
  refreshToken: z.string().min(1),
});

export function logoutUser() {
  return async (input: z.infer<typeof schema>) => {
    schema.parse(input);
    return { message: "Logged out successfully" };
  };
}
