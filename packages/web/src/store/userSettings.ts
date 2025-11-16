import type { UserSettings } from "@shared/schemas/userSettings";
import { createWithEqualityFn } from "zustand/traditional";

interface UserSettingsState {
  settings: UserSettings | null;
  initialized: boolean;
  setSettings: (settings: UserSettings | null) => void;
  markInitialized: () => void;
  clearSettings: () => void;
}

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
