import { create } from "zustand";

import type { AuthUser } from "@/lib/auth";

interface UserState {
  user: AuthUser | null;
  setUser: (user: AuthUser) => void;
  clearUser: () => void;
}

/**
 * 認証ユーザー情報を管理するストアです。
 *
 * - user: 現在ログイン中のユーザー情報（未ログイン時は null）
 * - setUser: ユーザー情報を設定する
 * - clearUser: ユーザー情報をクリアする（ログアウト時に使用）
 */
export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}));
