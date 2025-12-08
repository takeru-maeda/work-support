import type { ReactNode } from "react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { useUserStore } from "@/store/user";
import { PageSkeleton } from "@/components/skeleton/PageSkeleton";
import { ensureUserSettings } from "@/services/userSettings";
import { useUserSettingsStore } from "@/store/userSettings";
import { reportUiError } from "@/services/logs";
import type { UserSettings } from "@shared/schemas/userSettings";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: Readonly<AuthGuardProps>) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState<boolean>(true);
  const user: AuthUser | null = useUserStore((s) => s.user);
  const setUser = useUserStore.getState().setUser;
  const clearUser = useUserStore.getState().clearUser;
  const setUserSettings = useUserSettingsStore.getState().setSettings;
  const clearUserSettings = useUserSettingsStore.getState().clearSettings;
  const markUserSettingsInitialized =
    useUserSettingsStore.getState().markInitialized;

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const currentUser: AuthUser | null = await getCurrentUser();

        if (!active) return;

        if (!currentUser) {
          clearUser();
          clearUserSettings();
          navigate(ROUTES.landing, { replace: true });
          return;
        }

        setUser(currentUser);
        try {
          const settings: UserSettings = await ensureUserSettings();
          setUserSettings(settings);
        } catch (error) {
          markUserSettingsInitialized();
          await reportUiError(error, {
            message: "Failed to ensure user settings",
          });
        }
      } finally {
        if (active) {
          setChecking(false);
        }
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [
    clearUser,
    clearUserSettings,
    markUserSettingsInitialized,
    navigate,
    setUser,
    setUserSettings,
  ]);

  if (checking) return <PageSkeleton />;
  if (!user) return null;

  return <>{children}</>;
}
