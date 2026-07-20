// Server Components (inside Docker) use API_URL → http://backend:4000
// Client Components (browser JS) use NEXT_PUBLIC_API_URL → http://localhost:4000
const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000")
  : (process.env.API_URL || "http://localhost:4000");

let _clientToken: string | null = null;

/** Store the JWT token for client-side API requests. */
export function setClientToken(token: string | null): void {
  _clientToken = token;
}

/** Get the stored JWT token. */
export function getClientToken(): string | null {
  return _clientToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (typeof window !== "undefined" && _clientToken) {
    headers["Authorization"] = `Bearer ${_clientToken}`;
  } else if (typeof window === "undefined") {
    // Server Components: read JWT from httpOnly cookie
    try {
      const { cookies } = await import("next/headers");
      const token = (await cookies()).get("token")?.value;
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } catch { /* not in Next.js context */ }
  }

  if (options?.headers) Object.assign(headers, options.headers);

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { code: "UNKNOWN", message: res.statusText } }));
    throw new ApiError(res.status, body.error?.code || "UNKNOWN", body.error?.message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
