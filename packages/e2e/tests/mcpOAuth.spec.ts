import { createHash, randomBytes, randomUUID } from "node:crypto";

import { expect, test } from "../support/fixtures.ts";
import { API_URL, localSupabase } from "../support/localStack.ts";

// MCP のアプリとの連携（docs/specs/mcp/spec.md の AC-mcp-14、AC-platform-20）。
// アプリの自動登録 → 認可 → web の同意の画面（ログインを挟む） → トークン → /mcp のツール、を通す
const CLIENT_REDIRECT = "http://127.0.0.1:65535/callback";

test("MCP のアプリを自動登録し、同意の画面で許可すると、そのトークンで /mcp のツールを呼べる（/api は 401）", async ({
  page,
  user,
}) => {
  const sb = localSupabase();
  const clientName = `E2E のアプリ ${randomUUID().slice(0, 8)}`;
  const registered = await fetch(`${sb.url}/auth/v1/oauth/clients/register`, {
    method: "POST",
    headers: { apikey: sb.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: clientName,
      redirect_uris: [CLIENT_REDIRECT],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  expect(registered.ok, await registered.clone().text()).toBe(true);
  const { client_id: clientId } = (await registered.json()) as {
    client_id: string;
  };

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  // アプリの戻り先はブラウザの中で受け止め、認可コードだけを取り出す
  let code: string | null = null;
  await page.route(`${CLIENT_REDIRECT}**`, async (route) => {
    code = new URL(route.request().url()).searchParams.get("code");
    await route.fulfill({ body: "連携しました" });
  });

  const authorize = new URL(`${sb.url}/auth/v1/oauth/authorize`);
  authorize.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: CLIENT_REDIRECT,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: randomUUID(),
  }).toString();
  await page.goto(authorize.toString());

  // 同意の画面は、ログインしていなければログインへ移し、ログインのあとで戻す
  await expect(page).toHaveURL(/\/login\?redirect=%2Foauth%2Fconsent/);
  await page.getByRole("textbox", { name: "メールアドレス" }).fill(user.email);
  await page.getByRole("textbox", { name: "パスワード" }).fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(
    page.getByRole("heading", { name: "アプリの連携を許可しますか？" }),
  ).toBeVisible();
  await expect(page.getByText(clientName)).toBeVisible();
  await page.getByRole("button", { name: "許可" }).click();
  await expect.poll(() => code).not.toBeNull();

  const token = await fetch(`${sb.url}/auth/v1/oauth/token`, {
    method: "POST",
    headers: {
      apikey: sb.anonKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code as unknown as string,
      redirect_uri: CLIENT_REDIRECT,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });
  expect(token.ok, await token.clone().text()).toBe(true);
  const { access_token: accessToken } = (await token.json()) as {
    access_token: string;
  };

  const mcp = await fetch(`${API_URL}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "get_mission", arguments: {} },
    }),
  });
  expect(mcp.status).toBe(200);
  expect(await mcp.text()).toContain("ミッションはまだありません。");

  const api = await fetch(`${API_URL}/api/missions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(api.status).toBe(401);
});
