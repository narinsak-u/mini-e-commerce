"use client";

import { create } from "zustand";

// ── Auth / session ────────────────────────────────────────────

export interface SessionInfo {
  sub: string;
  role: string;
}

interface AuthState {
  session: SessionInfo | null;
  token: string | null;
  setSession: (session: SessionInfo | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  token: null,
  setSession: (session) => set({ session }),
  setToken: (token) => set({ token }),
}));

// ── Cart UI state ─────────────────────────────────────────────

interface CartUIState {
  /** Number of items the last cart fetch returned — used for the NavBar badge. */
  itemCount: number;
  setItemCount: (count: number) => void;
}

export const useCartStore = create<CartUIState>((set) => ({
  itemCount: 0,
  setItemCount: (itemCount) => set({ itemCount }),
}));
