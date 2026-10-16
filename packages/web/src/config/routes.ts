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
  /** MCP のアプリとの連携の同意（Supabase の OAuth 2.1 サーバーが移してくる） */
  oauthConsent: "/oauth/consent",
} as const;

export type RouteKey = keyof typeof ROUTES;
