import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { inject, onTestFinished } from "vitest";

import app from "../src";

import type { HonoEnv } from "../src/customTypes";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  const admin = adminClient();
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
    const { error } = await admin.auth.admin.deleteUser(id);
    // テストの中で API から削除した（DELETE /api/users/me）ときは、すでに消えている
    if (error && error.status !== 404) {
      throw new Error(`テスト用ユーザーを消せませんでした: ${error.message}`);
    }
  });

  const signedIn = await browserClient().auth.signInWithPassword({
    email,
    password,
  });
  if (signedIn.error || !signedIn.data.session) {
    throw new Error(
      `テスト用ユーザーでログインできませんでした: ${signedIn.error?.message}`,
    );
  }
  return { id, email, accessToken: signedIn.data.session.access_token };
}

/**
 * ブラウザと同じ権限（anon キー + 本人のアクセストークン）の supabase-js のクライアントを返します。
 * Storage のようにブラウザから直接呼ぶものを、RLS のポリシーを通して確かめるときに使う。
 * `user` を省くと、ログインしていない状態のクライアントになる。
 */
export function browserClient(user?: TestUser): SupabaseClient {
  const sb = inject("supabase");
  return createClient(sb.url, sb.anonKey, {
    auth: { persistSession: false },
    global: user
      ? { headers: { Authorization: `Bearer ${user.accessToken}` } }
      : {},
  });
}

/** RLS を通らない管理用（service role）のクライアントを返します。テストの準備と後片付け、結果の確認に使う */
export function adminClient(): SupabaseClient {
  const sb = inject("supabase");
  return createClient(sb.url, sb.serviceRoleKey, {
    auth: { persistSession: false },
  });
}

interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "OPTIONS";
  user?: TestUser;
  /** `user` の代わりに送る Bearer トークン（GAS 用の API キーなど） */
  bearer?: string;
  body?: unknown;
  /** 追加・上書きするヘッダー（`Bearer ` で始まらない Authorization、Origin など） */
  headers?: Record<string, string>;
  /** JSON にせずにそのまま送る本文（壊れた JSON など）。`body` より優先する */
  rawBody?: string;
}

/**
 * API を呼びます（`app.request`）。`waitUntil` に渡された後処理（アクセスログの更新、メール送信など）は、
 * 応答のあとで待ち合わせてから返します（テストの後片付けと競合させないため）。
 */
export async function callApi(
  path: string,
  {
    method = "GET",
    user,
    bearer,
    body,
    headers: extra,
    rawBody,
  }: ApiRequest = {},
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
  if (body !== undefined || rawBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  Object.assign(headers, extra);

  const res = await app.request(
    path,
    {
      method,
      headers,
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    },
    testEnv(),
    executionCtx,
  );
  await Promise.allSettled(pending);
  return res;
}
