import { randomUUID } from "node:crypto";

import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSigningKey,
  jwtTestEnv,
  serveJwks,
  signHs256,
  signWithKey,
  tamper,
  unsignedToken,
} from "../../test/tokens";
import { AppError } from "../lib/errors";

import { apiKeyAuthMiddleware, jwtAuthMiddleware } from "./auth";

import type { HonoEnv } from "../custom-types";

/**
 * jwtAuthMiddleware を HTTP で通して、ステータスを確かめる（DB に触れない）。
 * エラーの応答は本物の globalErrorHandler ではなく、AppError のステータスを返すだけの onError で作る
 */
function createApp() {
  const app = new Hono<HonoEnv>();
  app.use("*", jwtAuthMiddleware);
  app.get("/me", (c) => c.json(c.get("user") ?? null));
  app.onError((err, c) =>
    c.json(
      { error: err.message },
      err instanceof AppError ? err.statusCode : 500,
    ),
  );
  return app;
}

async function call(token: string | null, env = jwtTestEnv()) {
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  return createApp().request("/me", { headers }, env);
}

// GAS 用の認証は、Auth の管理 API（listUsers）でユーザーを探す。結合テストでは失敗させられないので、ここで差し替える
const { listUsers } = vi.hoisted(() => ({ listUsers: vi.fn() }));
vi.mock("../lib/supabase", () => ({
  createSupabaseClient: () => ({ auth: { admin: { listUsers } } }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  listUsers.mockReset();
});

describe("jwtAuthMiddleware", () => {
  it("AC-platform-01: 共有シークレットで HS256 署名したトークンは通り、sub と email がユーザーになる", async () => {
    const fetchMock = serveJwks([]);
    const sub = randomUUID();
    const res = await call(await signHs256({ sub, email: "a@example.test" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: sub, email: "a@example.test" });
    // AC-platform-06: HS256 では JWKS を取りに行かない
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["ES256", "RS256"] as const)(
    "AC-platform-02: JWKS の公開鍵で %s 署名したトークンは通り、sub と email がユーザーになる",
    async (alg) => {
      const key = await createSigningKey(alg);
      serveJwks([key.publicJwk]);
      const sub = randomUUID();
      const res = await call(
        await signWithKey(key, { sub, email: "b@example.test" }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ id: sub, email: "b@example.test" });
    },
  );

  it("AC-platform-05: Authorization ヘッダーが無いと 401", async () => {
    expect((await call(null)).status).toBe(401);
  });

  it("AC-platform-05: Bearer の形でないと 401", async () => {
    const res = await createApp().request(
      "/me",
      { headers: { Authorization: "Basic abc" } },
      jwtTestEnv(),
    );
    expect(res.status).toBe(401);
  });

  it.each([
    ["改ざんした HS256", async () => tamper(await signHs256())],
    [
      "期限切れの HS256",
      async () => signHs256(undefined, { expiresIn: "-1m" }),
    ],
    [
      "別の共有シークレットで署名した HS256",
      async () =>
        signHs256(undefined, {
          secret: "another-secret-with-at-least-32-characters!!",
        }),
    ],
    ["署名なし（alg: none）", async () => unsignedToken()],
  ])("AC-platform-03/04: %s は 401", async (_label, makeToken) => {
    serveJwks([]);
    expect((await call(await makeToken())).status).toBe(401);
  });

  it("AC-platform-03: sub が無いトークン（anon のキーと同じ形）は 401", async () => {
    serveJwks([]);
    const res = await call(await signHs256({ role: "anon" }));
    expect(res.status).toBe(401);
  });

  it("AC-platform-03: 改ざんした ES256 は 401", async () => {
    const key = await createSigningKey("ES256");
    serveJwks([key.publicJwk]);
    expect((await call(tamper(await signWithKey(key)))).status).toBe(401);
  });

  it("AC-platform-03: JWKS に無い鍵で署名した ES256 は 401", async () => {
    const published = await createSigningKey("ES256");
    const unknown = await createSigningKey("ES256");
    serveJwks([published.publicJwk]);
    expect((await call(await signWithKey(unknown))).status).toBe(401);
  });

  it("AC-platform-06: JWKS の取得に失敗したとき、ES256 は 401（500 にならない）", async () => {
    const key = await createSigningKey("ES256");
    serveJwks(null);
    expect((await call(await signWithKey(key))).status).toBe(401);
  });
});

describe("apiKeyAuthMiddleware", () => {
  const API_KEY = "test-api-key";

  function callGas(email: string) {
    const app = new Hono<HonoEnv>();
    app.post("/", apiKeyAuthMiddleware, (c) => c.json(c.get("user") ?? null));
    app.onError((err, c) =>
      c.json(
        { error: err.message },
        err instanceof AppError ? err.statusCode : 500,
      ),
    );
    return app.request(
      "/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ date: "2026-10-13", email, effort: "" }),
      },
      { ...jwtTestEnv(), API_KEY },
    );
  }

  it("AC-effort-ingest-gas-01: メールアドレスのユーザーが見つかれば、そのユーザーになる", async () => {
    const id = randomUUID();
    listUsers.mockResolvedValue({
      data: { users: [{ id, email: "User@Example.test" }] },
      error: null,
    });

    const res = await callGas("user@example.test");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id, email: "User@Example.test" });
  });

  it("AC-effort-ingest-gas-03: ユーザーが見つからなければ 400 User not found", async () => {
    listUsers.mockResolvedValue({ data: { users: [] }, error: null });

    const res = await callGas("nobody@example.test");

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "User not found" });
  });

  it("Auth の管理 API が失敗したら 500 Failed to look up user（送り手の誤りと区別する）", async () => {
    listUsers.mockResolvedValue({
      data: { users: [] },
      error: { message: "Auth is down", status: 503 },
    });

    const res = await callGas("user@example.test");

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to look up user" });
  });
});
