import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ROUTES } from "@/config/routes";
import { AppHeaderHomeLink } from "@/components/layout/header/AppHeaderHomeLink";
import {
  AppHeaderUserMenu,
  type UserProfile,
} from "@/components/layout/header/AppHeaderUserMenu";
import { AppHeaderDesktopNav } from "@/components/layout/header/AppHeaderDesktopNav";
import { AppHeaderMobileNav } from "@/components/layout/header/AppHeaderMobileNav";
import type { AppHeaderNavLink } from "@/types/navigation";
import { logout, type AuthUser } from "@/lib/auth";
import { useUserStore } from "@/store/user";

const navLinks: AppHeaderNavLink[] = [
  { href: ROUTES.home, label: "ホーム" },
  { href: ROUTES.effort, label: "工数登録" },
  { href: ROUTES.goals, label: "目標管理" },
  { href: ROUTES.weeklyReport, label: "週報出力" },
];

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(false);
  const user: AuthUser | null = useUserStore((state) => state.user);
  const clearUser = useUserStore.getState().clearUser;

  const userProfile: UserProfile = {
    name: user?.name ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  };

  const handleLogout = async () => {
    const result = await logout();

    if (result.success) {
      clearUser();
      navigate(ROUTES.login);
    } else if (result.error) {
      console.error(result.error);
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        <AppHeaderHomeLink />

        <div className="flex items-center gap-4">
          <AppHeaderDesktopNav
            navLinks={navLinks}
            currentPath={location.pathname}
          />
          <ThemeToggle />
          <AppHeaderUserMenu
            userProfile={userProfile}
            onNavigateProfile={() => navigate(ROUTES.profile)}
            onLogout={handleLogout}
          />
          <AppHeaderMobileNav
            open={open}
            onOpenChange={setOpen}
            navLinks={navLinks}
            currentPath={location.pathname}
          />
        </div>
      </div>
    </header>
  );
}
