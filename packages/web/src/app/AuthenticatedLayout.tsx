import { Outlet } from "react-router-dom";

import { AppHeader } from "@/components/layout/header/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { AuthGuard } from "@/features/auth/components/AuthGuard";

export function AuthenticatedLayout() {
  return (
    <AuthGuard>
      <AppHeader />
      <div className="pt-16 pb-16 md:pb-0">
        <Outlet />
      </div>
      <MobileBottomNav />
    </AuthGuard>
  );
}
