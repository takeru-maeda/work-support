export const ROUTES = {
  home: "/",
  effort: "/effort",
  goals: "/goals",
  goalsAdd: "/goals/add",
  weeklyReport: "/weekly-report",
  profile: "/profile",
  login: "/login",
  signup: "/signup",
  resetPassword: "/reset-password",
} as const;

export type RouteKey = keyof typeof ROUTES;
