import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark";

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

/**
 * テーマ設定の永続化に使用するストレージキーです。
 */
export const themeStorageKey = "work-support-theme";

/**
 * テーマ設定を管理するストアです。
 *
 * - theme: 現在のテーマ設定（"light" または "dark"）
 * - setTheme: テーマを指定した値に変更する
 * - toggleTheme: ライト/ダークテーマを切り替える
 *
 * localStorage に永続化され、ページリロード後も設定が維持されます。
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        set({ theme: next });
      },
    }),
    {
      name: themeStorageKey,
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => window.localStorage)
          : undefined,
    },
  ),
);
