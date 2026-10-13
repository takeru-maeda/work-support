import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { inject, onTestFinished } from "vitest";

import app from "../src";

import type { HonoEnv } from "../src/custom-types";

/** メール送信（GAS）の宛先。テストでは `test/setup.ts` がこの宛先への fetch を横取りする */
export const TEST_GAS_ENDPOINT = "http://gas.test/send";

/** 結合テスト用の環境変数（Workers の Bindings）。接続先はローカルの Supabase だけ */
export function testEnv(): HonoEnv["Bindings"] {
  const sb = inject("supabase");
  return {
    SUPABASE_URL: sb.url,
    SUPABASE_SERVICE_ROLE_KEY: sb.serviceRoleKey,
    SUPABASE_JWT_SECRET: sb.jwtSecret,
    DEVELOPER_EMAIL: "developer@example.test",
    API_KEY: "test-api-key",
    APP_EMAIL: "app@example.test",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    GOOGLE_REDIRECT_URI: "",
    GAS_EMAIL_ENDPOINT: TEST_GAS_ENDPOINT,
    DEV_FRONTEND_URL: "http://localhost:5173",
  };
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

/**
 * 一意なメールアドレスのテスト用ユーザーを作り、ログインしてアクセストークンを得ます。
 * テストが終わるとユーザーを削除します（関連するデータは外部キーの CASCADE で消える）。
 */
export async function createTestUser(): Promise<TestUser> {
  const sb = inject("supabase");
  const admin = createClient(sb.url, sb.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const email = `test-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(
      `テスト用ユーザーを作れませんでした: ${created.error?.message}`,
    );
  }
  const id = created.data.user.id;
  onTestFinished(async () => {
    await admin.auth.admin.deleteUser(id);
  });

  const client = createClient(sb.url, sb.anonKey, {
    auth: { persistSession: false },
  });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) {
    throw new Error(
      `テスト用ユーザーでログインできませんでした: ${signedIn.error?.message}`,
    );
  }
  return { id, email, accessToken: signedIn.data.session.access_token };
}

interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  user?: TestUser;
  /** `user` の代わりに送る Bearer トークン（GAS 用の API キーなど） */
  bearer?: string;
  body?: unknown;
}

/**
 * API を呼びます（`app.request`）。`waitUntil` に渡された後処理（アクセスログの更新、メール送信など）は、
 * 応答のあとで待ち合わせてから返します（テストの後片付けと競合させないため）。
 */
export async function callApi(
  path: string,
  { method = "GET", user, bearer, body }: ApiRequest = {},
): Promise<Response> {
  const pending: Promise<unknown>[] = [];
  const executionCtx = {
    waitUntil: (p: Promise<unknown>) => void pending.push(p),
    passThroughOnException: () => {},
    props: {},
  };
  const headers: Record<string, string> = {};
  const token: string | undefined = bearer ?? user?.accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await app.request(
    path,
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    testEnv(),
    executionCtx,
  );
  await Promise.allSettled(pending);
  return res;
}
