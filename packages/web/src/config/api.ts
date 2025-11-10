const DEFAULT_API_BASE_URL = "http://localhost:8787";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const API_ENDPOINTS = {
  missions: "/api/missions",
  goals: "/api/goals",
  goalsCurrent: "/api/goals/current",
  goalsHistory: "/api/goals/history",
  goalsPreviousWeekProgress: "/api/goals/progress/previous-week",
  weeklyReport: "/api/reports/weekly",
  workRecords: "/api/reports/work-records",
  errorLogs: "/api/logs/error",
  userSettings: "/api/user-settings",
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;
