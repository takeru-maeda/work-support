import { createRemoteJWKSet, errors, jwtVerify } from "jose";

import type { HonoEnv } from "../customTypes";
import type { JWTPayload, JWTVerifyGetKey } from "jose";

/** 受け付ける署名方式。HS256 は共有シークレット、ES256 / RS256 は Supabase が JWKS で公開する鍵で検証する */
const ALGORITHMS = ["HS256", "ES256", "RS256"];

// JWKS の URL ごとに、isolate の中で使い回す。jose が鍵を 10 分キャッシュし、
// 知らない kid のときだけ取り直す（30 秒に 1 回まで）。Workers の上では、取得中の通信を
// リクエストをまたいで共有しない作りになっている（jose 5.10 の jwks/remote.js）
const remoteJwks = new Map<string, JWTVerifyGetKey>();

/** JWKS の取得に失敗したあと、取りに行かずに失敗させる時間 */
const FETCH_FAILURE_COOLDOWN_MS = 30 * 1000;

/**
 * Supabase プロジェクトの JWKS（公開鍵の一覧）の URL を返します。
 *
 * @param supabaseUrl プロジェクトの URL（末尾の / はあってもなくてもよい。パスがあれば残す）
 * @returns JWKS の URL
 */
export const jwksUrl = (supabaseUrl: string): URL =>
  new URL(
    "auth/v1/.well-known/jwks.json",
    supabaseUrl.endsWith("/") ? supabaseUrl : `${supabaseUrl}/`,
  );

/**
 * jose の取り直しの間隔（30 秒）は、取得に成功した時刻が基準で、失敗が続く間は効かない。
 * Supabase の障害時に、公開鍵方式のトークンのたびに取得を試みて待たされないよう、失敗した時刻からも間隔を空ける
 */
const withFetchFailureCooldown = (jwks: JWTVerifyGetKey): JWTVerifyGetKey => {
  let failedAt: number | null = null;
  return async (header, token) => {
    if (
      failedAt !== null &&
      Date.now() - failedAt < FETCH_FAILURE_COOLDOWN_MS
    ) {
      throw new Error("JWKS fetch is cooling down after a failure");
    }
    try {
      const key = await jwks(header, token);
      failedAt = null;
      return key;
    } catch (error) {
      // 鍵が見つからないのは取得の失敗ではない（取り直しの間隔は jose が管理する）
      if (!(error instanceof errors.JWKSNoMatchingKey)) failedAt = Date.now();
      throw error;
    }
  };
};

const remoteJwksFor = (supabaseUrl: string): JWTVerifyGetKey => {
  const url: URL = jwksUrl(supabaseUrl);
  let jwks: JWTVerifyGetKey | undefined = remoteJwks.get(url.href);
  if (!jwks) {
    jwks = withFetchFailureCooldown(createRemoteJWKSet(url));
    remoteJwks.set(url.href, jwks);
  }
  return jwks;
};

/**
 * Supabase が発行したアクセストークンを検証し、ペイロードを返します。
 *
 * 署名方式はトークンのヘッダーで決まる。共有シークレットは HS256 の検証にだけ使い、
 * 公開鍵方式は JWKS の鍵でだけ検証する（方式の取り違えで検証を素通りさせない）。
 *
 * @param token アクセストークン
 * @param env 環境変数バインディング（SUPABASE_URL、SUPABASE_JWT_SECRET を使う）
 * @returns 検証済みのペイロード
 * @throws 署名、期限、署名方式のどれかが正しくないとき、または JWKS を取得できないとき
 */
export const verifySupabaseAccessToken = async (
  token: string,
  env: HonoEnv["Bindings"],
): Promise<JWTPayload> => {
  const secret: Uint8Array = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  const getKey: JWTVerifyGetKey = (header, input) => {
    if (header.alg === "HS256") return secret;
    // Supabase の公開鍵方式のトークンには必ず kid が付く。無いものは、鍵の選び違いを避けるため通さない
    if (!header.kid) throw new Error("Missing kid in an asymmetric JWT");
    return remoteJwksFor(env.SUPABASE_URL)(header, input);
  };
  const { payload } = await jwtVerify(token, getKey, {
    algorithms: ALGORITHMS,
  });
  return payload;
};
