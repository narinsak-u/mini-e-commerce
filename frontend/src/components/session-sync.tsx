"use client";

import { useEffect } from "react";
import { useAuthStore, type SessionInfo } from "@/lib/store";

/**
 * Hydrates the Zustand auth store with session data from the server layout.
 * Render alongside NavBar so client components can read session without prop drilling.
 */
export function SessionSync({ session }: { session: SessionInfo | null }) {
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    setSession(session);
    // ponytail: object reference changes every navigation; narrow to stable sub field
  }, [session?.sub, setSession]);

  return null;
}
