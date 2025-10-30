import type { JSX } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ROUTES } from "@/config/routes";
import EffortsPage from "@/pages/efforts/EffortsPage";
import EffortsNewPage from "@/pages/efforts/EffortsNewPage";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import SignupPage from "@/pages/auth/SignupPage";
import AddGoalsPage from "@/pages/goals/AddGoalsPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import HomePage from "@/pages/home/HomePage";
import ProfilePage from "@/pages/profile/ProfilePage";
import WeeklyReportPage from "@/pages/reports/WeeklyReportPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import { useThemeStore, type Theme } from "@/store/theme";

const App = (): JSX.Element => {
  const theme: Theme = useThemeStore((s) => s.theme);

  return (
    <ThemeProvider defaultTheme="light">
      <div className="min-h-screen bg-background text-foreground">
        <div className="pt-16">
          <Toaster position="top-center" theme={theme} />
          <Routes>
            <Route element={<AuthenticatedLayout />}>
              <Route path={ROUTES.home} element={<HomePage />} />
              <Route path={ROUTES.effortsNew} element={<EffortsNewPage />} />
              <Route path={ROUTES.efforts} element={<EffortsPage />} />
              <Route path={ROUTES.goals} element={<GoalsPage />} />
              <Route path={ROUTES.goalsAdd} element={<AddGoalsPage />} />
              <Route
                path={ROUTES.weeklyReport}
                element={<WeeklyReportPage />}
              />
              <Route path={ROUTES.profile} element={<ProfilePage />} />
              <Route path={ROUTES.settings} element={<SettingsPage />} />
            </Route>
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.signup} element={<SignupPage />} />
            <Route
              path={ROUTES.resetPassword}
              element={<ResetPasswordPage />}
            />
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Routes>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default App;
