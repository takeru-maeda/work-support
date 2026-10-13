import { randomUUID } from "node:crypto";

import { SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  TEST_JWT_SECRET,
  createSigningKey,
  jwtTestEnv,
  serveJwks,
  signHs256,
  signWithKey,
} from "../../test/tokens";

import { jwksUrl, verifySupabaseAccessToken } from "./jwt";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("jwksUrl", () => {
  it("AC-platform-02: SUPABASE_URL の末尾の / の有無にかかわらず、同じ JWKS の URL になる", () => {
    const expected = "https://abc.supabase.co/auth/v1/.well-known/jwks.json";
    expect(jwksUrl("https://abc.supabase.co").href).toBe(expected);
    expect(jwksUrl("https://abc.supabase.co/").href).toBe(expected);
  });

  it("SUPABASE_URL のパス（プロキシの下の階層など）は残す", () => {
    expect(jwksUrl("https://example.test/supabase").href).toBe(
      "https://example.test/supabase/auth/v1/.well-known/jwks.json",
    );
  });

  it("ローカルの Supabase（ポート付きの http）でも組み立てられる", () => {
    expect(jwksUrl("http://127.0.0.1:55321").href).toBe(
      "http://127.0.0.1:55321/auth/v1/.well-known/jwks.json",
    );
  });
});

describe("verifySupabaseAccessToken", () => {
  it("AC-platform-02: JWKS はプロジェクトの URL から取得する", async () => {
    const key = await createSigningKey("ES256");
    const fetchMock = serveJwks([key.publicJwk]);
    const env = jwtTestEnv("https://xyz.supabase.test");
    await verifySupabaseAccessToken(await signWithKey(key), env);
    const requested = fetchMock.mock.calls[0] as unknown as [URL | string];
    expect(String(requested[0])).toBe(
      "https://xyz.supabase.test/auth/v1/.well-known/jwks.json",
    );
  });

  it("AC-platform-03: ES256 なのに kid が無いトークンは失敗する", async () => {
    const key = await createSigningKey("ES256");
    serveJwks([key.publicJwk]);
    await expect(
      verifySupabaseAccessToken(
        await signWithKey(key, undefined, { kid: null }),
        jwtTestEnv(),
      ),
    ).rejects.toThrow();
  });

  it("AC-platform-04: 許可していない署名方式（HS512）は失敗する", async () => {
    serveJwks([]);
    const token = await new SignJWT({ sub: randomUUID() })
      .setProtectedHeader({ alg: "HS512" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(TEST_JWT_SECRET));
    await expect(
      verifySupabaseAccessToken(token, jwtTestEnv()),
    ).rejects.toThrow();
  });

  it("INV-1: ES256 のヘッダーで、共有シークレットで署名したトークンは通らない", async () => {
    serveJwks([]);
    const encode = (v: unknown) =>
      Buffer.from(JSON.stringify(v)).toString("base64url");
    const hs = await signHs256();
    const [, payload, signature] = hs.split(".");
    const forged = `${encode({ alg: "ES256", typ: "JWT", kid: "x" })}.${payload}.${signature}`;
    await expect(
      verifySupabaseAccessToken(forged, jwtTestEnv()),
    ).rejects.toThrow();
  });

  it("INV-1: RS256 のヘッダーで、EC の鍵の kid を指すトークンは通らない", async () => {
    const ec = await createSigningKey("ES256");
    const rsa = await createSigningKey("RS256");
    serveJwks([ec.publicJwk]);
    // RSA の秘密鍵で署名し、kid だけ EC の公開鍵を指す
    const token = await signWithKey(rsa, undefined, { kid: ec.kid });
    await expect(
      verifySupabaseAccessToken(token, jwtTestEnv()),
    ).rejects.toThrow();
  });

  it("AC-platform-07: 2 回目の検証では JWKS を取りに行かず、10 分たつと取り直す", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const key = await createSigningKey("ES256");
    const fetchMock = serveJwks([key.publicJwk]);
    const env = jwtTestEnv();

    await verifySupabaseAccessToken(await signWithKey(key), env);
    await verifySupabaseAccessToken(await signWithKey(key), env);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 10 * 60 * 1000 + 1);
    await verifySupabaseAccessToken(
      await signWithKey(key, undefined, { expiresIn: "2h" }),
      env,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("AC-platform-07: 知らない kid では取り直すが、30 秒以内の 2 回目は取りに行かない", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const published = await createSigningKey("ES256");
    const unknown = await createSigningKey("ES256");
    const fetchMock = serveJwks([published.publicJwk]);
    const env = jwtTestEnv();

    await verifySupabaseAccessToken(await signWithKey(published), env); // 1 回目の取得
    vi.setSystemTime(Date.now() + 31 * 1000);
    await expect(
      verifySupabaseAccessToken(await signWithKey(unknown), env),
    ).rejects.toThrow(); // 取り直す
    await expect(
      verifySupabaseAccessToken(await signWithKey(unknown), env),
    ).rejects.toThrow(); // 30 秒以内
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("AC-platform-07: JWKS の取得に失敗したあと 30 秒は取りに行かず、すぐ失敗する", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const key = await createSigningKey("ES256");
    const fetchMock = serveJwks(null);
    const env = jwtTestEnv();

    await expect(
      verifySupabaseAccessToken(await signWithKey(key), env),
    ).rejects.toThrow();
    await expect(
      verifySupabaseAccessToken(await signWithKey(key), env),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // 30 秒たてば取り直し、取得できれば通る
    vi.setSystemTime(Date.now() + 31 * 1000);
    serveJwks([key.publicJwk]);
    await expect(
      verifySupabaseAccessToken(
        await signWithKey(key, undefined, { expiresIn: "2h" }),
        env,
      ),
    ).resolves.toBeDefined();
  });
});
