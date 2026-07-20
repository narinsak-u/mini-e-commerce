"use client";

import { useEffect } from "react";
import { useAuthStore, type SessionInfo } from "@/lib/store";
import { setClientToken } from "@/lib/api";

/**
 * Hydrates the Zustand auth store with session data from the server layout.
 * Also restores the JWT token for client-side API requests on page refresh.
 */
export function SessionSync({ session, token }: { session: SessionInfo | null; token?: string | null }) {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    setSession(session);
    if (token) setClientToken(token);
    // ponytail: object reference changes every navigation; narrow to stable sub field
  }, [session?.sub, token, setSession]);

  return null;
}
