import axios, { AxiosHeaders, type AxiosInstance } from "axios";

import { API_BASE_URL } from "@/config/api";
import { getAccessToken } from "@/lib/auth";

/**
 * 認証トークンを自動付与する API クライアントです。
 *
 * Axios インスタンスをラップし、リクエストインターセプターで Supabase の
 * アクセストークンを Authorization ヘッダーに自動付与します。
 * API_BASE_URL をベース URL として設定しており、すべての API リクエストで使用されます。
 *
 * @example
 * ```ts
 * import apiClient from "@/lib/apiClient";
 * const response = await apiClient.get("/api/projects");
 * ```
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const token: string | null = await getAccessToken();

  if (token) {
    let headers: AxiosHeaders;

    if (config.headers instanceof AxiosHeaders) {
      headers = config.headers;
    } else {
      headers = new AxiosHeaders(config.headers);
    }

    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }

  return config;
});

export default apiClient;
