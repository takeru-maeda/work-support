import { useLocation, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { ROUTES } from "@/config/routes";
import { MAIN_NAVIGATION } from "@/config/navigation";
import { AppHeaderHomeLink } from "@/components/layout/header/AppHeaderHomeLink";
import { AppHeaderUserMenu } from "@/components/layout/header/AppHeaderUserMenu";
import { AppHeaderDesktopNav } from "@/components/layout/header/AppHeaderDesktopNav";
import type { AppHeaderNavLink } from "@/types/navigation";
import { logout, type AuthUser, type LogoutResult } from "@/lib/auth";
import { useUserStore } from "@/store/user";
import type { UserProfile } from "@/types/userProfile";

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const user: AuthUser | null = useUserStore((state) => state.user);
  const clearUser = useUserStore.getState().clearUser;

  const userProfile: UserProfile = {
    name: user?.name ?? "",
    email: user?.email ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  };

  const handleLogout = async () => {
    const result: LogoutResult = await logout();

    if (result.success) {
      clearUser();
      navigate(ROUTES.login);
    } else if (result.error) {
      console.error(result.error);
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 max-w-7xl">
        <AppHeaderHomeLink />

        <div className="flex items-center gap-4">
          <AppHeaderDesktopNav
            navLinks={MAIN_NAVIGATION.map(
              (item): AppHeaderNavLink => ({
                href: item.route,
                label: item.label,
              }),
            )}
            currentPath={location.pathname}
          />
          <ThemeToggle />
          <AppHeaderUserMenu
            userProfile={userProfile}
            onNavigateProfile={() => navigate(ROUTES.profile)}
            onNavigateSettings={() => navigate(ROUTES.settings)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
}
