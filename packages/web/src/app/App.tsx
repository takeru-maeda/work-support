import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { ROUTES } from "@/config/routes";
import LoginPage from "@/pages/auth/LoginPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import SignupPage from "@/pages/auth/SignupPage";
import EffortPage from "@/pages/effort/EffortPage";
import AddGoalsPage from "@/pages/goals/AddGoalsPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import HomePage from "@/pages/home/HomePage";
import ProfilePage from "@/pages/profile/ProfilePage";
import WeeklyReportPage from "@/pages/reports/WeeklyReportPage";
import { useThemeStore, type Theme } from "@/store/theme";

function App() {
  const theme: Theme = useThemeStore((s) => s.theme);

  return (
    <ThemeProvider defaultTheme="light">
      <div className="min-h-screen bg-background text-foreground">
        <div className="pt-16">
          <Toaster position="top-center" theme={theme} />
          <Routes>
            <Route element={<AuthenticatedLayout />}>
              <Route path={ROUTES.home} element={<HomePage />} />
              <Route path={ROUTES.effort} element={<EffortPage />} />
              <Route path={ROUTES.goals} element={<GoalsPage />} />
              <Route path={ROUTES.goalsAdd} element={<AddGoalsPage />} />
              <Route
                path={ROUTES.weeklyReport}
                element={<WeeklyReportPage />}
              />
              <Route path={ROUTES.profile} element={<ProfilePage />} />
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
}

export default App;
