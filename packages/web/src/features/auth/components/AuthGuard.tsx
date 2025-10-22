import type { ReactNode } from "react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { useUserStore } from "@/store/user";
import { LoadingSkeleton } from "@/components/layout/LoadingSkeleton";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: Readonly<AuthGuardProps>) {
  const navigate = useNavigate();
  const [checking, setChecking] = useState<boolean>(true);
  const user: AuthUser | null = useUserStore((s) => s.user);
  const setUser = useUserStore.getState().setUser;
  const clearUser = useUserStore.getState().clearUser;

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const currentUser: AuthUser | null = await getCurrentUser();

        if (!active) return;

        if (!currentUser) {
          clearUser();
          navigate(ROUTES.login, { replace: true });
          return;
        }

        setUser(currentUser);
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
  }, [clearUser, navigate, setUser]);

  if (checking) return <LoadingSkeleton />;
  if (!user) return null;

  return <>{children}</>;
}
