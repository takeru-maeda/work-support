import { describe, expect, it } from "vitest";

import { adminClient, callApi, createTestUser, testEnv } from "./helpers";

// リクエストの流れ、アクセスログ、エラーの応答と記録、CORS、OpenAPI、画面からのエラーの記録
// （docs/specs/platform/spec.md の AC-08、09、11〜17、INV-4、INV-5）
interface AccessLog {
  id: number;
  user_id: string | null;
  path: string;
  method: string;
  status_code: number | null;
  duration_ms: number | null;
}

async function accessLog(id: number): Promise<AccessLog> {
  const { data, error } = await adminClient()
    .from("access_logs")
    .select("id, user_id, path, method, status_code, duration_ms")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as AccessLog;
}

async function errorLogsOf(accessLogId: number) {
  const { data, error } = await adminClient()
    .from("error_logs")
    .select("level, message, source, user_agent, page_url, app_version")
    .eq("access_log_id", accessLogId);
  if (error) throw new Error(error.message);
  return data;
}

/** そのユーザーのいちばん新しいアクセスログ */
async function latestAccessLogOf(userId: string): Promise<AccessLog> {
  const { data, error } = await adminClient()
    .from("access_logs")
    .select("id, user_id, path, method, status_code, duration_ms")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1)
    .single();
  if (error) throw new Error(error.message);
  return data as AccessLog;
}

const ALLOWED_ORIGIN = testEnv().DEV_FRONTEND_URL as string;

describe("ルート", () => {
  it("AC-platform-08: GET / は「Hello Work Support」", async () => {
    const res = await callApi("/");

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Hello Work Support");
  });

  it("AC-platform-08: どれにも当たらないパスは 404（文字の「404 Not Found」）", async () => {
    const res = await callApi("/no-such-path");

    expect(res.status).toBe(404);
    expect(await res.text()).toBe("404 Not Found");
  });

  it("AC-platform-08: 機能の下の存在しないパスは、トークンが無ければ 401、有効なら 404", async () => {
    const user = await createTestUser();

    expect((await callApi("/api/goals/no/such")).status).toBe(401);
    expect((await callApi("/api/goals/no/such", { user })).status).toBe(404);
  });

  it("AC-platform-08: /api/effort の下の JWT のルートは、GAS の API キーでは 401", async () => {
    const res = await callApi("/api/effort/draft", {
      bearer: testEnv().API_KEY,
    });

    expect(res.status).toBe(401);
  });
});

describe("アクセスログ", () => {
  it("AC-platform-09: パス（クエリを除く）、メソッド、ユーザー、ステータス、処理時間を 1 行に残す", async () => {
    const user = await createTestUser();
    await callApi("/api/reports/weekly?date=2026-10-14", { user });

    expect(await latestAccessLogOf(user.id)).toMatchObject({
      path: "/api/reports/weekly",
      method: "GET",
      status_code: 200,
      duration_ms: expect.any(Number),
    });
  });
});

describe("エラーの応答と記録", () => {
  it("AC-platform-11 / 12 / INV-4: AppError は { error, accessLogId } で返し、同じ番号で error_logs とアクセスログをたどれる", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/goals/999999999", {
      method: "DELETE",
      user,
      headers: { "User-Agent": "test-agent", "x-app-version": "9.9.9" },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; accessLogId: number };
    expect(body).toEqual({
      error: "Goal not found for the given user and id",
      accessLogId: expect.any(Number),
    });
    expect(await accessLog(body.accessLogId)).toMatchObject({
      user_id: user.id,
      path: "/api/goals/999999999",
      status_code: 400,
    });
    expect(await errorLogsOf(body.accessLogId)).toEqual([
      expect.objectContaining({
        source: "API",
        user_agent: "test-agent",
        app_version: "9.9.9",
        page_url: expect.stringContaining("/api/goals/999999999"),
      }),
    ]);
  });

  it("AC-platform-11: 壊れた JSON の本文は 400 ではなく 500 Internal Server Error（既知の落とし穴）", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/missions", {
      method: "PUT",
      user,
      rawBody: "{壊れた",
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Internal Server Error",
      accessLogId: expect.any(Number),
    });
  });

  it("AC-platform-13: 入力の検証の失敗は { data, error, success: false } の 400 で、error_logs に残らない", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/missions", {
      method: "PUT",
      user,
      body: { content: "" },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      data: { content: "" },
      success: false,
      error: expect.any(Array),
    });
    expect(body).not.toHaveProperty("accessLogId");
    const log = await latestAccessLogOf(user.id);
    expect(await errorLogsOf(log.id)).toEqual([]);
  });
});

describe("CORS", () => {
  it("AC-platform-14: 許可した Origin には Allow-Origin と資格情報の許可を返す", async () => {
    const res = await callApi("/", { headers: { Origin: ALLOWED_ORIGIN } });

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true");
  });

  it("AC-platform-14: プリフライトは、メソッドとヘッダーを許可し、結果を 1 日使い回す。認証はとばす", async () => {
    const res = await callApi("/api/goals/current", {
      method: "OPTIONS",
      headers: {
        Origin: ALLOWED_ORIGIN,
        "Access-Control-Request-Method": "PUT",
        "Access-Control-Request-Headers": "Authorization, Content-Type",
      },
    });

    expect(res.status).toBeLessThan(300);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED_ORIGIN);
    expect(
      res.headers.get("Access-Control-Allow-Methods")?.split(",").sort(),
    ).toEqual(["DELETE", "GET", "OPTIONS", "POST", "PUT"]);
    expect(res.headers.get("Access-Control-Allow-Headers")).toBe(
      "Content-Type,Authorization",
    );
    expect(res.headers.get("Access-Control-Max-Age")).toBe("86400");
  });

  it.each([
    ["ほかのサイト", "https://evil.example"],
    ["前方だけ一致", `${ALLOWED_ORIGIN}.evil.example`],
  ])(
    "AC-platform-15 / INV-5: %s の Origin には Allow-Origin を付けないが、処理はする（既知の落とし穴）",
    async (_label, origin) => {
      const user = await createTestUser();
      const res = await callApi("/api/missions", {
        method: "PUT",
        user,
        body: { content: "書き込まれる" },
        headers: { Origin: origin },
      });

      expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
      expect(res.status).toBe(200);
      const mission = await callApi("/api/missions", { user });
      expect(JSON.stringify(await mission.json())).toContain("書き込まれる");
    },
  );
});

describe("OpenAPI", () => {
  it("AC-platform-16: /openapi と /ui は認証なしで開ける（本番で出さないように直す予定）", async () => {
    const openapi = await callApi("/openapi");
    expect(openapi.status).toBe(200);
    expect(
      Object.keys(((await openapi.json()) as { paths: object }).paths),
    ).toContain("/api/goals/current");

    const ui = await callApi("/ui");
    expect(ui.status).toBe(200);
    expect(await ui.text()).toContain("swagger");
  });
});

describe("POST /api/logs/error", () => {
  it("AC-platform-17: error_logs に 1 行書き、201 { id, recordedAt } を返す。User-Agent が無ければヘッダーの値", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/logs/error", {
      method: "POST",
      user,
      headers: { "User-Agent": "header-agent" },
      body: {
        message: "画面のエラー",
        level: "WARNING",
        source: "UI",
        pageUrl: "http://app.test/goals",
        appVersion: "1.0.7",
        clientContext: { goalId: 1 },
      },
    });

    expect(res.status, await res.clone().text()).toBe(201);
    const body = (await res.json()) as { id: number; recordedAt: string };
    expect(body).toEqual({
      id: expect.any(Number),
      recordedAt: expect.any(String),
    });
    const { data } = await adminClient()
      .from("error_logs")
      .select("message, level, source, user_agent, page_url, client_context")
      .eq("id", body.id)
      .single();
    expect(data).toEqual({
      message: "画面のエラー",
      level: "WARNING",
      source: "UI",
      user_agent: "header-agent",
      page_url: "http://app.test/goals",
      client_context: { goalId: 1 },
    });
  });

  it.each([
    ["メッセージが空", { message: "", level: "ERROR", source: "UI" }],
    ["レベルが一覧に無い", { message: "x", level: "INFO", source: "UI" }],
  ])("AC-platform-17: %s なら 400", async (_label, body) => {
    const user = await createTestUser();
    const res = await callApi("/api/logs/error", {
      method: "POST",
      user,
      body,
    });

    expect(res.status).toBe(400);
  });

  it("AC-platform-17: トークンが無ければ 401", async () => {
    const res = await callApi("/api/logs/error", {
      method: "POST",
      body: { message: "x", level: "ERROR", source: "UI" },
    });

    expect(res.status).toBe(401);
  });
});
