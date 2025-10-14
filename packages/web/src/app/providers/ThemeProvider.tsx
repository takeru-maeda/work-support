import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { themeStorageKey, useThemeStore, type Theme } from "@/store/theme";

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: Readonly<ThemeProviderProps>) {
  const theme: Theme = useThemeStore((s) => s.theme);
  const hydratedRef = useRef<boolean>(false);

  useEffect(() => {
    const ensureDefaultTheme = () => {
      if (typeof window === "undefined") return;
      const stored: string | null =
        window.localStorage.getItem(themeStorageKey);
      if (!stored) {
        useThemeStore.getState().setTheme(defaultTheme);
      }
      hydratedRef.current = true;
    };

    const unsub = useThemeStore.persist?.onFinishHydration?.(() => {
      ensureDefaultTheme();
    });

    if (useThemeStore.persist?.hasHydrated?.()) {
      ensureDefaultTheme();
    }

    return unsub;
  }, [defaultTheme]);

  useEffect(() => {
    if (!hydratedRef.current && typeof window === "undefined") return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}
