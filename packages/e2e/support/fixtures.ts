import { randomUUID } from "node:crypto";

import { test as base, expect } from "@playwright/test";

import { localSupabase } from "./localStack.ts";

import type { Page } from "@playwright/test";

export interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

/** ローカル以外へ出ていった API の通信（開発用・本番の Supabase につながっていないかの見張り） */
const isLocal = (url: string): boolean => {
  const { hostname } = new URL(url);
  return hostname === "localhost" || hostname === "127.0.0.1";
};

const adminFetch = async (
  path: string,
  init: RequestInit,
): Promise<Response> => {
  const sb = localSupabase();
  return fetch(`${sb.url}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: sb.serviceRoleKey,
      Authorization: `Bearer ${sb.serviceRoleKey}`,
      "Content-Type": "application/json",
    },
  });
};

/**
 * ログインした状態の画面を開きます（ログインの画面から入力する）。
 *
 * @param page Playwright のページ
 * @param user ログインするユーザー
 */
export async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "メールアドレス" }).fill(user.email);
  await page.getByRole("textbox", { name: "パスワード" }).fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByText(`ようこそ、${user.name}さん`)).toBeVisible();
}

export const test = base.extend<{ user: TestUser; guardNetwork: void }>({
  // テストごとに一意なユーザーを作り、終わったら消す（関連するデータは外部キーの CASCADE で消える）
  // Playwright は第 1 引数の分割代入で依存するフィクスチャを読むので、依存が無くても {} と書く
  // eslint-disable-next-line no-empty-pattern
  user: async ({}, use) => {
    const user: TestUser = {
      id: "",
      name: "E2E ユーザー",
      email: `e2e-${randomUUID()}@example.test`,
      password: `pw-${randomUUID()}`,
    };
    const res = await adminFetch("/users", {
      method: "POST",
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
      }),
    });
    if (!res.ok) {
      throw new Error(
        `テスト用ユーザーを作れませんでした: ${await res.text()}`,
      );
    }
    user.id = ((await res.json()) as { id: string }).id;
    await use(user);
    await adminFetch(`/users/${user.id}`, { method: "DELETE" });
  },
  guardNetwork: [
    async ({ page }, use) => {
      const external: string[] = [];
      page.on("request", (request) => {
        const type: string = request.resourceType();
        if ((type === "fetch" || type === "xhr") && !isLocal(request.url())) {
          external.push(request.url());
        }
      });
      await use();
      expect(external, "ローカル以外の API に通信した").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
