import type { UserSettings } from "@shared/schemas/userSettings";
import { createWithEqualityFn } from "zustand/traditional";

interface UserSettingsState {
  settings: UserSettings | null;
  initialized: boolean;
  setSettings: (settings: UserSettings | null) => void;
  markInitialized: () => void;
  clearSettings: () => void;
}

/**
 * ユーザー設定を管理するストアです。
 *
 * - settings: ユーザー設定（通知設定など）。未取得時は null
 * - initialized: 設定の初期化が完了したかどうか
 * - setSettings: 設定を更新し、初期化完了フラグを立てる
 * - markInitialized: 設定取得を試みたことを記録する（設定が存在しない場合も含む）
 * - clearSettings: 設定をクリアし、初期化状態をリセットする（ログアウト時に使用）
 */
export const useUserSettingsStore = createWithEqualityFn<UserSettingsState>(
  (set) => ({
    settings: null,
    initialized: false,
    setSettings: (settings) => set({ settings, initialized: true }),
    markInitialized: () =>
      set((state) =>
        state.initialized ? state : { ...state, initialized: true },
      ),
    clearSettings: () => set({ settings: null, initialized: false }),
  }),
);
