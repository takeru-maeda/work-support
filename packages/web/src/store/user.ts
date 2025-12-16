import { create } from "zustand";

import type { AuthUser } from "@/lib/auth";

interface UserState {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

/**
 * 認証ユーザー情報を管理するストアです。
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
