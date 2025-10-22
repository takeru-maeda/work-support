const DEFAULT_API_BASE_URL = "http://localhost:8787";

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export const API_ENDPOINTS = {
  missions: "/api/missions",
} as const;

export type ApiEndpointKey = keyof typeof API_ENDPOINTS;
