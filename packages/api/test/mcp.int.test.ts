import { randomInt } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { adminClient, callApi, createTestUser, testEnv } from "./helpers";
import { getOAuthAccessToken } from "./oauthHelpers";
import { sentMails } from "./setup";

import type { TestUser } from "./helpers";

// MCP サーバー（docs/specs/mcp/spec.md）。MCP のクライアントの SDK は使わず、JSON-RPC を直接送る
const ORIGIN = "http://localhost";
const METADATA_URL = `${ORIGIN}/.well-known/oauth-protected-resource/mcp`;

const TOOL_NAMES = [
  "create_goal_period",
  "get_goals",
  "get_mission",
  "get_weekly_report",
  "list_projects",
  "log_effort",
  "search_work_records",
  "update_goal_progress",
  "update_mission",
];

interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string };
}

interface ToolResult {
  content: { type: string; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** 応答の本文を読む（SDK は JSON か、SSE の data: の行で返す） */
async function readRpc<T>(res: Response): Promise<JsonRpcResponse<T>> {
  const text = await res.text();
  if (!(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
    return JSON.parse(text) as JsonRpcResponse<T>;
  }
  const data = text
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("");
  return JSON.parse(data) as JsonRpcResponse<T>;
}

/** /mcp に JSON-RPC の要求を 1 つ送る */
async function rpc<T>(
  bearer: string | undefined,
  method: string,
  params: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Promise<{ res: Response; body: JsonRpcResponse<T> }> {
  const res = await callApi("/mcp", {
    method: "POST",
    bearer,
    body: { jsonrpc: "2.0", id: 1, method, params },
    headers: { Accept: "application/json, text/event-stream", ...headers },
  });
  if (res.status !== 200) return { res, body: {} as JsonRpcResponse<T> };
  return { res, body: await readRpc<T>(res) };
}

/** ツールを呼び、結果を返す */
async function callTool(
  bearer: string,
  name: string,
  args: Record<string, unknown> = {},
): Promise<ToolResult> {
  const { res, body } = await rpc<ToolResult>(bearer, "tools/call", {
    name,
    arguments: args,
  });
  expect(res.status).toBe(200);
  if (!body.result)
    throw new Error(`ツールの結果が無い: ${JSON.stringify(body)}`);
  return body.result;
}

/** OAuth のクライアントのトークンを持ったテスト用ユーザー */
async function createMcpUser(): Promise<TestUser & { oauthToken: string }> {
  const user = await createTestUser();
  const { accessToken } = await getOAuthAccessToken(user);
  return { ...user, oauthToken: accessToken };
}

/** その IP アドレスのアクセスログと、そこから書かれた error_logs */
async function logsFromIp(ip: string) {
  const { data: logs, error } = await adminClient()
    .from("access_logs")
    .select("id, path, status_code, user_id")
    .eq("ip_address", ip);
  if (error) throw new Error(error.message);
  const ids = (logs ?? []).map((log) => log.id as number);
  const { data: errors, error: e2 } = await adminClient()
    .from("error_logs")
    .select("id")
    .in("access_log_id", ids.length ? ids : [-1]);
  if (e2) throw new Error(e2.message);
  return { logs: logs ?? [], errors: errors ?? [] };
}

const uniqueIp = (): string =>
  `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;

describe("入口と認証", () => {
  it.each([
    ["トークンが無い", undefined],
    ["壊れたトークン", "not-a-jwt"],
  ])(
    "AC-mcp-01: %s と、SDK の形の 401 と WWW-Authenticate を返し、error_logs に残さない",
    async (_label, bearer) => {
      const ip = uniqueIp();
      const { res } = await rpc(
        bearer,
        "tools/list",
        {},
        {
          "cf-connecting-ip": ip,
        },
      );

      expect(res.status).toBe(401);
      expect(res.headers.get("WWW-Authenticate")).toContain(
        `resource_metadata="${METADATA_URL}"`,
      );
      expect(await res.json()).toMatchObject({ error: "invalid_token" });
      const { logs, errors } = await logsFromIp(ip);
      expect(logs).toEqual([
        expect.objectContaining({ path: "/mcp", status_code: 401 }),
      ]);
      expect(errors).toEqual([]);
    },
  );

  it("AC-mcp-01: GET /mcp は 405", async () => {
    const user = await createMcpUser();
    const res = await callApi("/mcp", {
      bearer: user.oauthToken,
      headers: { Accept: "text/event-stream" },
    });

    expect(res.status).toBe(405);
  });

  it.each([
    "/.well-known/oauth-protected-resource/mcp",
    "/.well-known/oauth-protected-resource",
  ])(
    "AC-mcp-02: %s は、認証なしで保護されたリソースの情報を返す",
    async (path) => {
      const res = await callApi(path);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        resource: `${ORIGIN}/mcp`,
        authorization_servers: [`${testEnv().SUPABASE_URL}/auth/v1`],
        bearer_methods_supported: ["header"],
      });
    },
  );

  it("AC-mcp-03: OAuth のクライアントのトークンでも web のトークンでも、9 つのツールの一覧を返す。アクセスログにユーザーが残る", async () => {
    const user = await createMcpUser();

    for (const token of [user.oauthToken, user.accessToken]) {
      const { res, body } = await rpc<{ tools: { name: string }[] }>(
        token,
        "tools/list",
      );
      expect(res.status).toBe(200);
      expect(body.result?.tools.map((t) => t.name).sort()).toEqual(TOOL_NAMES);
    }
    const { data } = await adminClient()
      .from("access_logs")
      .select("path, status_code")
      .eq("user_id", user.id);
    expect(data).toEqual([
      { path: "/mcp", status_code: 200 },
      { path: "/mcp", status_code: 200 },
    ]);
  });
});

// ---- データの用意 ----

interface EntryInput {
  project: string;
  task: string;
  hours: number;
  estimated?: number | null;
}

/** web の画面と同じ API で工数を登録する */
async function seedEffort(user: TestUser, date: string, entries: EntryInput[]) {
  const res = await callApi("/api/effort/entries", {
    method: "POST",
    user,
    body: {
      date,
      entries: entries.map((e) => ({
        project_id: null,
        project_name: e.project,
        task_id: null,
        task_name: e.task,
        estimated_hours: e.estimated ?? null,
        hours: e.hours,
      })),
    },
  });
  expect(res.status, await res.clone().text()).toBe(201);
  sentMails.length = 0;
}

interface GoalSeed {
  title: string;
  weight: number;
  progress?: number;
  start_date: string;
  end_date: string;
  created_at?: string;
}

async function seedGoals(user: TestUser, goals: GoalSeed[]) {
  const { data, error } = await adminClient()
    .from("goals")
    .insert(
      goals.map((g) => ({ user_id: user.id, content: "", progress: 0, ...g })),
    )
    .select("id, title, end_date, progress");
  if (error) throw new Error(error.message);
  return data as {
    id: number;
    title: string;
    end_date: string;
    progress: number;
  }[];
}

async function goalRowsOf(user: TestUser) {
  const { data, error } = await adminClient()
    .from("goals")
    .select("id, title, progress, start_date, end_date")
    .eq("user_id", user.id)
    .order("id");
  if (error) throw new Error(error.message);
  return data;
}

async function workRecordCount(user: TestUser): Promise<number> {
  const { count, error } = await adminClient()
    .from("work_records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

const textOf = (result: ToolResult): string =>
  result.content.map((c) => c.text).join("\n");

const NOT_CURRENT_GOAL = "現在の期間の目標が見つかりません。";

describe("読むツール", () => {
  describe("get_weekly_report", () => {
    it("AC-mcp-04: 指定した日を含む週の週報を、画面と同じ本文と、工数のまとめ・目標の進捗の値で返す", async () => {
      const user = await createMcpUser();
      await seedEffort(user, "2026-10-13", [
        { project: "案件A", task: "設計", hours: 2 },
        { project: "案件A", task: "実装", hours: 3 },
      ]);
      await seedEffort(user, "2026-10-14", [
        { project: "案件B", task: "打合せ", hours: 1.5 },
      ]);
      const screen = (await (
        await callApi("/api/reports/weekly?date=2026-10-15", { user })
      ).json()) as { weeklyReport: string };

      const result = await callTool(user.oauthToken, "get_weekly_report", {
        date: "2026-10-15",
      });

      expect(result.isError).toBeFalsy();
      expect(textOf(result)).toBe(screen.weeklyReport);
      expect(result.structuredContent).toMatchObject({
        weekStart: "2026-10-12",
        weekEnd: "2026-10-18",
        totalHours: 6.5,
        projects: expect.arrayContaining([
          {
            name: "案件A",
            totalHours: 5,
            tasks: expect.arrayContaining([
              { name: "設計", hours: 2 },
              { name: "実装", hours: 3 },
            ]),
          },
          {
            name: "案件B",
            totalHours: 1.5,
            tasks: [{ name: "打合せ", hours: 1.5 }],
          },
        ]),
        goals: [],
        goalSummary: null,
      });
    });

    it("AC-mcp-04: date を省くと日本時間の今日の週（UTC ではまだ日曜日でも、日本時間で月曜日ならその週）", async () => {
      const user = await createMcpUser();
      await seedEffort(user, "2026-10-12", [
        { project: "案件A", task: "設計", hours: 2 },
      ]);
      // UTC は 2026-10-11（日）15:30、日本時間は 2026-10-12（月）0:30。トークンの期限より前なので検証は通る
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-11T15:30:00Z"));
      try {
        const result = await callTool(user.oauthToken, "get_weekly_report");

        expect(result.structuredContent).toMatchObject({
          weekStart: "2026-10-12",
          totalHours: 2,
        });
        expect(textOf(result)).toContain("10/12(月)：在宅 2h");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("search_work_records", () => {
    it("AC-mcp-05: 期間の工数の行を日付の昇順で返し、件数と合計を添える。他人の行は出ない", async () => {
      const user = await createMcpUser();
      const other = await createTestUser();
      await seedEffort(user, "2026-10-14", [
        { project: "案件A", task: "実装", hours: 3, estimated: 2 },
      ]);
      await seedEffort(user, "2026-10-13", [
        { project: "案件A", task: "設計", hours: 2 },
      ]);
      await seedEffort(user, "2026-09-30", [
        { project: "案件A", task: "設計", hours: 9 },
      ]);
      await seedEffort(other, "2026-10-13", [
        { project: "案件A", task: "設計", hours: 7 },
      ]);

      const result = await callTool(user.oauthToken, "search_work_records", {
        startDate: "2026-10-01",
        endDate: "2026-10-31",
      });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toEqual({
        records: [
          {
            date: "2026-10-13",
            projectName: "案件A",
            taskName: "設計",
            estimatedHours: null,
            hours: 2,
          },
          {
            date: "2026-10-14",
            projectName: "案件A",
            taskName: "実装",
            estimatedHours: 2,
            hours: 3,
          },
        ],
        count: 2,
        totalHours: 5,
        totalEstimatedHours: 2,
        truncated: false,
      });
    });

    it("AC-mcp-05: 案件名・タスク名は大文字小文字を区別した完全一致。タスク名だけならすべての案件から探す", async () => {
      const user = await createMcpUser();
      await seedEffort(user, "2026-10-13", [
        { project: "案件A", task: "Review", hours: 1 },
        { project: "案件a", task: "Review", hours: 2 },
        { project: "案件A", task: "review", hours: 4 },
        { project: "案件B", task: "Review", hours: 8 },
      ]);
      const search = async (args: Record<string, unknown>) =>
        (
          await callTool(user.oauthToken, "search_work_records", {
            startDate: "2026-10-13",
            endDate: "2026-10-13",
            ...args,
          })
        ).structuredContent as { totalHours: number; count: number };

      expect(await search({ projectName: "案件A" })).toMatchObject({
        totalHours: 5,
      });
      expect(
        await search({ projectName: "案件A", taskName: "Review" }),
      ).toMatchObject({
        totalHours: 1,
      });
      expect(await search({ taskName: "Review" })).toMatchObject({
        totalHours: 11,
        count: 3,
      });
      expect(await search({ projectName: "案件" })).toMatchObject({ count: 0 });
    });

    it("AC-mcp-05: ちょうど 500 行なら切り詰めない", async () => {
      const user = await createMcpUser();
      await seedEffort(user, "2026-01-01", [
        { project: "案件A", task: "設計", hours: 1 },
      ]);
      const { data: task } = await adminClient()
        .from("tasks")
        .select("id, projects!inner(user_id)")
        .eq("projects.user_id", user.id)
        .single();
      const { error } = await adminClient()
        .from("work_records")
        .insert(
          Array.from({ length: 499 }, () => ({
            user_id: user.id,
            task_id: (task as { id: number }).id,
            work_date: "2026-01-02",
            hours: 1,
          })),
        );
      if (error) throw new Error(error.message);

      const result = await callTool(user.oauthToken, "search_work_records", {
        startDate: "2026-01-01",
        endDate: "2026-01-31",
      });

      const body = result.structuredContent as {
        records: unknown[];
        count: number;
        truncated: boolean;
      };
      expect(body.records).toHaveLength(500);
      expect(body).toMatchObject({ count: 500, truncated: false });
    });

    it("AC-mcp-05: 500 行を超えたら最初の 500 行と truncated を返し、件数と合計はすべての行で数える", async () => {
      const user = await createMcpUser();
      await seedEffort(user, "2026-01-01", [
        { project: "案件A", task: "設計", hours: 1 },
      ]);
      const { data: task } = await adminClient()
        .from("tasks")
        .select("id, projects!inner(user_id)")
        .eq("projects.user_id", user.id)
        .single();
      const rows = Array.from({ length: 1100 }, (_, i) => ({
        user_id: user.id,
        task_id: (task as { id: number }).id,
        work_date: `2026-${String(2 + (Math.floor(i / 28) % 11)).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
        hours: 0.5,
      }));
      const { error } = await adminClient().from("work_records").insert(rows);
      if (error) throw new Error(error.message);

      const result = await callTool(user.oauthToken, "search_work_records", {
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });

      const body = result.structuredContent as {
        records: { date: string }[];
        count: number;
        totalHours: number;
        truncated: boolean;
      };
      expect(body.records).toHaveLength(500);
      expect(body.records[0].date).toBe("2026-01-01");
      expect(body).toMatchObject({
        count: 1101,
        totalHours: 551,
        truncated: true,
      });
    });

    it.each([
      ["366 日", "2027-01-01", false],
      ["367 日", "2027-01-02", true],
      ["終了日が開始日より前", "2025-12-31", true],
    ])(
      "AC-mcp-05: 期間が %s なら isError=%s",
      async (_label, endDate, isError) => {
        const user = await createMcpUser();

        const result = await callTool(user.oauthToken, "search_work_records", {
          startDate: "2026-01-01",
          endDate,
        });

        expect(Boolean(result.isError)).toBe(isError);
      },
    );
  });

  it("AC-mcp-06: list_projects は、案件とその中のタスクの名前を元の表から返す（タスクの無い案件も）", async () => {
    const user = await createMcpUser();
    await seedEffort(user, "2026-10-13", [
      { project: "案件A", task: "設計", hours: 1 },
      { project: "案件A", task: "実装", hours: 1 },
      { project: "案件B", task: "打合せ", hours: 1 },
    ]);
    await adminClient()
      .from("projects")
      .insert({ user_id: user.id, name: "案件C" });
    const other = await createTestUser();
    await seedEffort(other, "2026-10-13", [
      { project: "他人の案件", task: "x", hours: 1 },
    ]);

    const result = await callTool(user.oauthToken, "list_projects");

    expect(result.structuredContent).toEqual({
      projects: [
        { name: "案件A", tasks: ["設計", "実装"] },
        { name: "案件B", tasks: ["打合せ"] },
        { name: "案件C", tasks: [] },
      ],
    });
  });

  describe("get_goals", () => {
    it("AC-mcp-07: 現在の期間、目標ごとの値と前週からの差、全体進捗と加重進捗を返す", async () => {
      const user = await createMcpUser();
      await seedGoals(user, [
        {
          title: "過去",
          weight: 100,
          progress: 80,
          start_date: "2026-04-01",
          end_date: "2026-09-30",
        },
      ]);
      const [main, sub] = await seedGoals(user, [
        {
          title: "メイン",
          weight: 70,
          progress: 50,
          start_date: "2026-10-01",
          end_date: "2027-03-31",
          created_at: "2026-01-01T00:00:00Z",
        },
        {
          title: "サブ",
          weight: 30,
          progress: 10,
          start_date: "2026-10-02",
          end_date: "2027-03-31",
          created_at: "2026-01-01T00:00:00Z",
        },
      ]);
      await adminClient().from("goal_progress_histories").insert({
        goal_id: main.id,
        progress: 30,
        recorded_at: "2026-01-05T00:00:00Z",
      });

      const result = await callTool(user.oauthToken, "get_goals");

      expect(result.structuredContent).toEqual({
        period: { startDate: "2026-10-01", endDate: "2027-03-31" },
        goals: [
          {
            id: main.id,
            title: "メイン",
            content: "",
            weight: 70,
            progress: 50,
            progressDiff: 20,
          },
          {
            id: sub.id,
            title: "サブ",
            content: "",
            weight: 30,
            progress: 10,
            progressDiff: 0,
          },
        ],
        summary: { simpleAverageProgress: 30, weightedAchievementRate: 38 },
      });
    });

    it("AC-mcp-07: includePast なら過去の目標も期間ごとに新しい順で返す。目標が無ければ期間は null", async () => {
      const user = await createMcpUser();
      expect(
        (await callTool(user.oauthToken, "get_goals", { includePast: true }))
          .structuredContent,
      ).toEqual({ period: null, goals: [], summary: null, pastPeriods: [] });

      await seedGoals(user, [
        {
          title: "前期",
          weight: 100,
          progress: 80,
          start_date: "2026-04-01",
          end_date: "2026-09-30",
        },
        {
          title: "前々期",
          weight: 100,
          progress: 90,
          start_date: "2025-10-01",
          end_date: "2026-03-31",
        },
        {
          title: "今期",
          weight: 100,
          start_date: "2026-10-01",
          end_date: "2027-03-31",
        },
      ]);

      const result = await callTool(user.oauthToken, "get_goals", {
        includePast: true,
      });

      expect(result.structuredContent).toMatchObject({
        period: { startDate: "2026-10-01", endDate: "2027-03-31" },
        pastPeriods: [
          {
            startDate: "2026-04-01",
            endDate: "2026-09-30",
            goals: [expect.objectContaining({ title: "前期", progress: 80 })],
          },
          {
            startDate: "2025-10-01",
            endDate: "2026-03-31",
            goals: [expect.objectContaining({ title: "前々期" })],
          },
        ],
      });
    });
  });

  it("AC-mcp-08: get_mission はミッションの本文を返す（無ければ空）", async () => {
    const user = await createMcpUser();
    expect(
      (await callTool(user.oauthToken, "get_mission")).structuredContent,
    ).toEqual({
      content: "",
    });

    await callApi("/api/missions", {
      method: "PUT",
      user,
      body: { content: "顧客の成功" },
    });

    expect(
      (await callTool(user.oauthToken, "get_mission")).structuredContent,
    ).toEqual({
      content: "顧客の成功",
    });
  });
});

describe("書くツール", () => {
  describe("log_effort", () => {
    it("AC-mcp-09: 工数を保存し、保存した行と新しく作った案件・タスクを返す。完了メールを送る", async () => {
      const user = await createMcpUser();
      await seedEffort(user, "2026-10-12", [
        { project: "案件A", task: "設計", hours: 1 },
      ]);

      const result = await callTool(user.oauthToken, "log_effort", {
        date: "2026-10-13",
        entries: [
          {
            projectName: "案件A",
            taskName: "設計",
            estimatedHours: 2,
            hours: 2.5,
          },
          { projectName: "案件B", taskName: "打合せ", hours: 1 },
        ],
        memo: "メモ",
      });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toEqual({
        date: "2026-10-13",
        saved: [
          {
            projectName: "案件A",
            taskName: "設計",
            estimatedHours: 2,
            hours: 2.5,
          },
          {
            projectName: "案件B",
            taskName: "打合せ",
            estimatedHours: null,
            hours: 1,
          },
        ],
        createdProjects: ["案件B"],
        createdTasks: [{ projectName: "案件B", taskName: "打合せ" }],
      });
      expect(await workRecordCount(user)).toBe(3);
      expect(sentMails).toEqual([
        expect.objectContaining({
          to: user.email,
          subject: "2026/10/13 工数を登録しました",
        }),
      ]);
    });

    it("AC-mcp-09: 1 つでも誤りがあれば何も保存せず、誤りの文を返す。メールも送らない", async () => {
      const user = await createMcpUser();

      const result = await callTool(user.oauthToken, "log_effort", {
        date: "2026-10-13",
        entries: [
          { projectName: "案件A", taskName: "設計", hours: 1 },
          { projectName: "案件A", taskName: "実装", hours: 100 },
        ],
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("100");
      expect(await workRecordCount(user)).toBe(0);
      expect(sentMails).toEqual([]);
    });

    it("AC-mcp-09: 設定でメールを止めていれば送らない", async () => {
      const user = await createMcpUser();
      await adminClient()
        .from("user_settings")
        .insert({ user_id: user.id, notify_effort_email: false });

      await callTool(user.oauthToken, "log_effort", {
        date: "2026-10-13",
        entries: [{ projectName: "案件A", taskName: "設計", hours: 1 }],
      });

      expect(await workRecordCount(user)).toBe(1);
      expect(sentMails).toEqual([]);
    });
  });

  describe("update_goal_progress", () => {
    it("AC-mcp-10: 現在の期間の目標の進捗率だけを変え、履歴を残す", async () => {
      const user = await createMcpUser();
      const [goal] = await seedGoals(user, [
        {
          title: "メイン",
          weight: 100,
          progress: 10,
          start_date: "2026-10-01",
          end_date: "2027-03-31",
        },
      ]);

      const result = await callTool(user.oauthToken, "update_goal_progress", {
        goalId: goal.id,
        progress: 45.5,
      });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toMatchObject({
        id: goal.id,
        title: "メイン",
        progress: 45.5,
      });
      const { data: histories } = await adminClient()
        .from("goal_progress_histories")
        .select("progress")
        .eq("goal_id", goal.id);
      expect(histories).toEqual([{ progress: 45.5 }]);
    });

    it("AC-mcp-10: 過去の期間の目標、他人の目標、無い目標は誤りで、何も変えない", async () => {
      const user = await createMcpUser();
      const other = await createTestUser();
      const [past] = await seedGoals(user, [
        {
          title: "過去",
          weight: 100,
          progress: 10,
          start_date: "2026-04-01",
          end_date: "2026-09-30",
        },
      ]);
      await seedGoals(user, [
        {
          title: "今期",
          weight: 100,
          start_date: "2026-10-01",
          end_date: "2027-03-31",
        },
      ]);
      const [others] = await seedGoals(other, [
        {
          title: "他人",
          weight: 100,
          progress: 10,
          start_date: "2026-10-01",
          end_date: "2027-03-31",
        },
      ]);

      for (const goalId of [past.id, others.id, 999999999]) {
        const result = await callTool(user.oauthToken, "update_goal_progress", {
          goalId,
          progress: 99,
        });
        expect(result.isError).toBe(true);
        expect(textOf(result)).toBe(NOT_CURRENT_GOAL);
      }
      expect((await goalRowsOf(user))[0]).toMatchObject({ progress: 10 });
      expect((await goalRowsOf(other))[0]).toMatchObject({ progress: 10 });
    });
  });

  describe("update_mission", () => {
    it("AC-mcp-11: ミッションを書き換える", async () => {
      const user = await createMcpUser();

      const result = await callTool(user.oauthToken, "update_mission", {
        content: "新しいミッション",
      });

      expect(result.structuredContent).toEqual({ content: "新しいミッション" });
      const screen = (await (
        await callApi("/api/missions", { user })
      ).json()) as {
        mission: { content: string };
      };
      expect(screen.mission.content).toBe("新しいミッション");
    });

    it("AC-mcp-11: 前後の空白を除いて空なら誤りで、今のミッションを残す", async () => {
      const user = await createMcpUser();
      await callApi("/api/missions", {
        method: "PUT",
        user,
        body: { content: "今のミッション" },
      });

      const result = await callTool(user.oauthToken, "update_mission", {
        content: "　 \n",
      });

      expect(result.isError).toBe(true);
      expect(
        (await callTool(user.oauthToken, "get_mission")).structuredContent,
      ).toEqual({
        content: "今のミッション",
      });
    });
  });

  describe("create_goal_period", () => {
    const period = {
      startDate: "2027-04-01",
      endDate: "2027-09-30",
      goals: [
        { title: "目標A", content: "内容", weight: 60 },
        { title: "目標B", content: "", weight: 40 },
      ],
    };

    interface Preview {
      errors: string[];
      warning: string;
      lockedGoals: { id: number; title: string }[];
      confirmToken?: string;
      created?: unknown[];
    }

    const preview = async (
      token: string,
      args: Record<string, unknown> = period,
    ) =>
      (await callTool(token, "create_goal_period", args))
        .structuredContent as unknown as Preview;

    it("AC-mcp-12: confirmToken が無ければ何も作らず、警告と編集できなくなる目標と confirmToken を返す", async () => {
      const user = await createMcpUser();
      const current = await seedGoals(user, [
        {
          title: "今期A",
          weight: 50,
          start_date: "2026-10-01",
          end_date: "2027-03-31",
        },
        {
          title: "今期B",
          weight: 50,
          start_date: "2026-10-01",
          end_date: "2027-03-31",
        },
      ]);

      const result = await preview(user.oauthToken);

      expect(result).toMatchObject({
        errors: [],
        warning:
          "この期間を作ると、今の期間（2026/10/01〜2027/03/31）の目標 2 件は過去の目標になり、編集できなくなります。期間はあとから変えられません。",
        lockedGoals: current.map((g) =>
          expect.objectContaining({ id: g.id, title: g.title }),
        ),
        confirmToken: expect.stringMatching(/^[0-9a-f]{64}$/),
      });
      expect(await goalRowsOf(user)).toHaveLength(2);
    });

    it("AC-mcp-12: 今の目標が無ければ、警告は期間を変えられないことだけ", async () => {
      const user = await createMcpUser();

      const result = await preview(user.oauthToken);

      expect(result).toMatchObject({
        errors: [],
        warning: "期間はあとから変えられません。",
        lockedGoals: [],
      });
    });

    it("AC-mcp-12: 誤りがあれば誤りの一覧を返し、confirmToken は付けない", async () => {
      const user = await createMcpUser();

      const result = await preview(user.oauthToken, {
        ...period,
        goals: [{ title: " ", content: "", weight: 50 }],
      });

      expect(result.errors).toEqual([
        "目標名を入力してください。",
        "重みの合計を100%にしてください。",
      ]);
      expect(result.confirmToken).toBeUndefined();
    });

    it("AC-mcp-12: プレビューの confirmToken を付けて同じ入力で呼ぶと作る", async () => {
      const user = await createMcpUser();
      const { confirmToken } = await preview(user.oauthToken);

      const result = await callTool(user.oauthToken, "create_goal_period", {
        ...period,
        confirmToken,
      });

      expect(result.isError).toBeFalsy();
      expect(
        (result.structuredContent as { created: unknown[] }).created,
      ).toHaveLength(2);
      expect((await goalRowsOf(user)).map((g) => g.title)).toEqual([
        "目標A",
        "目標B",
      ]);
    });

    it.each([
      [
        "入力を変えた",
        async (_user: TestUser) => ({ ...period, endDate: "2027-10-31" }),
      ],
      [
        "プレビューのあとに別の期間ができた",
        async (user: TestUser) => {
          await seedGoals(user, [
            {
              title: "別の画面",
              weight: 100,
              start_date: "2026-10-01",
              end_date: "2027-03-31",
            },
          ]);
          return period;
        },
      ],
    ])(
      "AC-mcp-12: %s ら、confirmToken が合わず何も作らない",
      async (_label, change) => {
        const user = await createMcpUser();
        const { confirmToken } = await preview(user.oauthToken);
        const args = await change(user);
        const before = await goalRowsOf(user);

        const result = await callTool(user.oauthToken, "create_goal_period", {
          ...args,
          confirmToken,
        });

        expect(result.isError).toBe(true);
        expect(textOf(result)).toBe(
          "プレビューのあとに内容か状況が変わりました。もう一度プレビューしてください。",
        );
        expect(await goalRowsOf(user)).toEqual(before);
      },
    );

    it("AC-mcp-12: 誤りがあれば、confirmToken を付けても作らない", async () => {
      const user = await createMcpUser();

      const result = await callTool(user.oauthToken, "create_goal_period", {
        ...period,
        goals: [{ title: "A", content: "", weight: 50 }],
        confirmToken: "0".repeat(64),
      });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain("重みの合計を100%にしてください。");
      expect(await goalRowsOf(user)).toEqual([]);
    });
  });
});

describe("誤りの返し方", () => {
  it("AC-mcp-13: ツールの入力の型の誤りは、HTTP 200 のツールの誤り（isError）で返し、何もしない", async () => {
    const user = await createMcpUser();

    const result = await callTool(user.oauthToken, "update_goal_progress", {
      goalId: "abc",
      progress: 101,
    });

    expect(result.isError).toBe(true);
  });

  it("AC-mcp-13: 無いツールは JSON-RPC の誤り", async () => {
    const user = await createMcpUser();

    const { res, body } = await rpc(user.oauthToken, "tools/call", {
      name: "delete_account",
      arguments: {},
    });

    expect(res.status).toBe(200);
    expect(
      body.error ?? (body.result as ToolResult | undefined)?.isError,
    ).toBeTruthy();
  });
});
