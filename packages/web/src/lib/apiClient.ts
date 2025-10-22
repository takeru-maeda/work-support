import axios, { AxiosHeaders, type AxiosInstance } from "axios";

import { API_BASE_URL } from "@/config/api";
import { getAccessToken } from "@/lib/auth";

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
