import { randomUUID } from "node:crypto";

import { SignJWT, exportJWK, generateKeyPair } from "jose";
import { vi } from "vitest";

import type { HonoEnv } from "../src/customTypes";
import type { JWK, JWTPayload, KeyLike } from "jose";

/** テスト用の共有シークレット（HS256）。本番の値とは無関係 */
export const TEST_JWT_SECRET = "test-jwt-secret-with-at-least-32-characters";

export interface SigningKey {
  alg: "ES256" | "RS256";
  kid: string;
  privateKey: KeyLike;
  /** JWKS に載せる公開鍵 */
  publicJwk: JWK;
}

/** 公開鍵方式の鍵の組を作ります（Supabase が JWKS で公開するのと同じ形の公開鍵を含む）。 */
export async function createSigningKey(
  alg: "ES256" | "RS256",
): Promise<SigningKey> {
  const { privateKey, publicKey } = await generateKeyPair(alg, {
    extractable: true,
  });
  const kid = randomUUID();
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg, use: "sig" };
  return { alg, kid, privateKey, publicJwk };
}

const defaultClaims = (): JWTPayload => ({
  sub: randomUUID(),
  email: "user@example.test",
  role: "authenticated",
});

/** 共有シークレットで HS256 署名したトークンを作ります（今の本番と同じ方式）。 */
export async function signHs256(
  claims: JWTPayload = defaultClaims(),
  { secret = TEST_JWT_SECRET, expiresIn = "1h" } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secret));
}

/**
 * 公開鍵方式（ES256 / RS256）で署名したトークンを作ります（ローカルの Supabase と同じ方式）。
 * `kid: null` を渡すと、ヘッダーに kid を付けない
 */
export async function signWithKey(
  key: SigningKey,
  claims: JWTPayload = defaultClaims(),
  { expiresIn = "1h", kid = key.kid as string | null } = {},
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: key.alg, typ: "JWT", ...(kid ? { kid } : {}) })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key.privateKey);
}

/** 署名なし（`alg: none`）のトークンを作ります。 */
export function unsignedToken(claims: JWTPayload = defaultClaims()): string {
  const encode = (v: unknown) =>
    Buffer.from(JSON.stringify(v)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
}

/** ペイロードのユーザー ID を別人に書き換え、署名はそのままにします（なりすましの試み）。 */
export function tamper(token: string): string {
  const [header, payload, signature] = token.split(".");
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString(),
  ) as JWTPayload;
  const forged = Buffer.from(
    JSON.stringify({ ...claims, sub: randomUUID() }),
  ).toString("base64url");
  return `${header}.${forged}.${signature}`;
}

/**
 * 認証の検証に使う環境変数だけを持つテスト用の Bindings を返します。
 * JWKS のキャッシュは SUPABASE_URL ごとなので、既定ではテストごとに別の URL にしてキャッシュをまたがせない
 */
export function jwtTestEnv(
  supabaseUrl = `https://${randomUUID()}.supabase.test`,
): HonoEnv["Bindings"] {
  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_JWT_SECRET: TEST_JWT_SECRET,
  } as HonoEnv["Bindings"];
}

/** JWKS の取得（グローバルの fetch）を差し替えます。`keys` が null なら取得に失敗させます */
export function serveJwks(keys: JWK[] | null) {
  const fetchMock = vi.fn(async () =>
    keys === null
      ? new Response("unavailable", { status: 503 })
      : Response.json({ keys }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
