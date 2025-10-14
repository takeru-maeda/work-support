import { Route, Routes } from "react-router-dom";

import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { ROUTES } from "@/config/routes";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import EffortPage from "@/pages/effort/EffortPage";
import AddGoalsPage from "@/pages/goals/AddGoalsPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import HomePage from "@/pages/home/HomePage";
import ProfilePage from "@/pages/profile/ProfilePage";
import WeeklyReportPage from "@/pages/reports/WeeklyReportPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <div className="min-h-screen bg-background text-foreground">
        <div className="pt-16">
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
          </Routes>
        </div>
        <Toaster />
      </div>
    </ThemeProvider>
  );
}

export default App;
