/**
 * アプリケーションのルート定義です。
 */
export const ROUTES = {
  landing: "/landing",
  home: "/",
  efforts: "/efforts",
  effortsNew: "/efforts/new",
  goals: "/goals",
  goalsAdd: "/goals/add",
  weeklyReport: "/weekly-report",
  profile: "/profile",
  settings: "/settings",
  login: "/login",
  signup: "/signup",
  resetPassword: "/reset-password",
} as const;

export type RouteKey = keyof typeof ROUTES;
