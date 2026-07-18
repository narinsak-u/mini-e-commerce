import { cookies } from "next/headers";

export interface Session {
  sub: string;
  role: string;
}

export function getSession(): Session | null {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getSession()?.role === "admin";
}
