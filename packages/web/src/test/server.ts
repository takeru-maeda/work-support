import { setupServer } from "msw/node";

import { API_BASE_URL } from "@/config/api";

/** テスト全体で使う MSW のサーバー。ハンドラーは各テストで `server.use()` で足す */
export const server = setupServer();

/**
 * API のパスを、テストの接続先（`VITE_API_BASE_URL`）の URL にします。
 *
 * @param path `/api/...` のパス
 * @returns MSW のハンドラーに渡す URL
 */
export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;
