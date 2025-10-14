"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useThemeStore, type Theme } from "@/store/theme";

export function ThemeToggle() {
  const theme: Theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore.getState().setTheme;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-9 w-9"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 text-muted-foreground rotate-0 scale-100 transition-all" />
      ) : (
        <Sun className="h-5 w-5 text-white rotate-0 scale-100 transition-all" />
      )}

      <span className="sr-only">テーマ切り替え</span>
    </Button>
  );
}
