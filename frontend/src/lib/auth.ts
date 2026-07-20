import { cookies } from "next/headers";
import { cache } from "react";

export interface Session {
  sub: string;
  role: string;
}

export const getToken = cache(async (): Promise<string | null> => {
  const token = (await cookies()).get("token")?.value;
  return token ?? null;
});

export const getSession = cache(async (): Promise<Session | null> => {
  const token = await getToken();
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
