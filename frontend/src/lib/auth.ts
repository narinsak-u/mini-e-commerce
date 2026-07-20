import { cookies } from "next/headers";
import { cache } from "react";

export interface Session {
  sub: string;
  role: string;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
});

export async function isAdmin(): Promise<boolean> {
  return (await getSession())?.role === "admin";
}
