import { createHash, randomBytes, randomUUID } from "node:crypto";

import { inject } from "vitest";

import type { TestUser } from "./helpers";

/** MCP のクライアントが登録する戻り先（ローカルのテストでは開かない） */
export const TEST_REDIRECT_URI = "http://127.0.0.1:65535/callback";

export interface OAuthClient {
  clientId: string;
  redirectUri: string;
}

export interface OAuthGrant {
  accessToken: string;
  clientId: string;
}

const base64Url = (buffer: Buffer): string => buffer.toString("base64url");

const authUrl = (path: string): string =>
  `${inject("supabase").url}/auth/v1${path}`;

const anonHeaders = (): Record<string, string> => ({
  apikey: inject("supabase").anonKey,
});

/**
 * ローカルの Supabase の OAuth 2.1 サーバーに、MCP のクライアントを自動登録（RFC 7591）します。
 *
 * @param redirectUri 戻り先
 * @returns 登録したクライアント
 */
export async function registerOAuthClient(
  redirectUri: string = TEST_REDIRECT_URI,
): Promise<OAuthClient> {
  const res = await fetch(authUrl("/oauth/clients/register"), {
    method: "POST",
    headers: { ...anonHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: `test-mcp-${randomUUID()}`,
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });
  if (!res.ok) {
    throw new Error(
      `クライアントを登録できませんでした: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { client_id: string };
  return { clientId: body.client_id, redirectUri };
}

/**
 * 認可の要求を始め、同意の画面に渡される `authorization_id` を返します。
 *
 * @param client 登録したクライアント
 * @returns `authorization_id` と、トークンの交換に使う PKCE の値
 */
export async function startAuthorization(
  client: OAuthClient,
): Promise<{ authorizationId: string; codeVerifier: string }> {
  const codeVerifier = base64Url(randomBytes(32));
  const codeChallenge = base64Url(
    createHash("sha256").update(codeVerifier).digest(),
  );
  const params = new URLSearchParams({
    response_type: "code",
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state: randomUUID(),
  });
  const res = await fetch(authUrl(`/oauth/authorize?${params}`), {
    headers: anonHeaders(),
    redirect: "manual",
  });
  const location = res.headers.get("location");
  if (!location) {
    throw new Error(
      `認可を始められませんでした: ${res.status} ${await res.text()}`,
    );
  }
  const authorizationId = new URL(location).searchParams.get(
    "authorization_id",
  );
  if (!authorizationId) {
    throw new Error(
      `同意の画面への移動に authorization_id が無い: ${location}`,
    );
  }
  return { authorizationId, codeVerifier };
}

/**
 * ログインしたユーザーとして、認可に同意（または拒否）します（同意の画面が呼ぶのと同じ API）。
 *
 * @returns Supabase が返す、クライアントの戻り先
 */
export async function decideAuthorization(
  user: TestUser,
  authorizationId: string,
  action: "approve" | "deny" = "approve",
): Promise<string> {
  // 同意の画面と同じく、先に認可の内容を読む（読んだユーザーに認可が結び付き、同意できるようになる）
  const details = await fetch(
    authUrl(`/oauth/authorizations/${authorizationId}`),
    {
      headers: {
        ...anonHeaders(),
        Authorization: `Bearer ${user.accessToken}`,
      },
    },
  );
  if (!details.ok) {
    throw new Error(
      `認可の内容を読めませんでした: ${details.status} ${await details.text()}`,
    );
  }
  const res = await fetch(
    authUrl(`/oauth/authorizations/${authorizationId}/consent`),
    {
      method: "POST",
      headers: {
        ...anonHeaders(),
        Authorization: `Bearer ${user.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    },
  );
  if (!res.ok) {
    throw new Error(`同意できませんでした: ${res.status} ${await res.text()}`);
  }
  return ((await res.json()) as { redirect_url: string }).redirect_url;
}

/**
 * 認可コードをアクセストークンに交換します。
 */
export async function exchangeCode(
  client: OAuthClient,
  code: string,
  codeVerifier: string,
): Promise<string> {
  const res = await fetch(authUrl("/oauth/token"), {
    method: "POST",
    headers: {
      ...anonHeaders(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: client.redirectUri,
      client_id: client.clientId,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `トークンに交換できませんでした: ${res.status} ${await res.text()}`,
    );
  }
  return ((await res.json()) as { access_token: string }).access_token;
}

/**
 * 自動登録 → 認可 → 同意 → トークンまでを通し、MCP のクライアントに出されるのと同じアクセストークンを得ます。
 *
 * @param user 同意するユーザー（`createTestUser` で作ったもの）
 * @returns OAuth のクライアントのアクセストークン（`client_id` の claim を持つ）
 */
export async function getOAuthAccessToken(user: TestUser): Promise<OAuthGrant> {
  const client = await registerOAuthClient();
  const { authorizationId, codeVerifier } = await startAuthorization(client);
  const redirectUrl = await decideAuthorization(user, authorizationId);
  const code = new URL(redirectUrl).searchParams.get("code");
  if (!code) throw new Error(`戻り先に code が無い: ${redirectUrl}`);
  const accessToken = await exchangeCode(client, code, codeVerifier);
  return { accessToken, clientId: client.clientId };
}
