import { Outlet } from "react-router-dom";

import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { AppHeader } from "@/components/layout/header/AppHeader";

export function AuthenticatedLayout() {
  return (
    <AuthGuard>
      <AppHeader />
      <Outlet />
    </AuthGuard>
  );
}
