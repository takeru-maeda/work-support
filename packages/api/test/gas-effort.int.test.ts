import { describe, expect, it } from "vitest";

import { adminClient, callApi, createTestUser, testEnv } from "./helpers";
import { sentMails } from "./setup";

import type { TestUser } from "./helpers";

// GAS / Google Form からの取り込み（POST /api/effort）は API キーで認証し、JWT は求めない。
// 同じパスの下に JWT のルート（/api/effort/*）があるので、認証の取り違えが起きていないことを確かめる
// （docs/specs/effort-ingest-gas/spec.md。docs/reference/api.md の「認証」の列もこれを前提にしている）
const EFFORT_TEXT = "■GAS の案件\n・設計：[2]<1.5>";
const DATE = "2026-10-13";

/** API キーを付けて取り込みを呼ぶ */
function ingest(email: string, effort: string, date: string = DATE) {
  return callApi("/api/effort", {
    method: "POST",
    bearer: testEnv().API_KEY,
    body: { date, email, effort },
  });
}

/** エラーの応答の `error`（メッセージ）を返す */
async function errorOf(res: Response): Promise<string> {
  return ((await res.json()) as { error: string }).error;
}

/** そのユーザーの工数を、案件名・タスク名と一緒に、ID の順で返す */
async function workRecordsOf(user: TestUser) {
  const { data, error } = await adminClient()
    .from("work_records")
    .select(
      "work_date, hours, estimated_hours, task_id, tasks(name, project_id, projects(name, user_id))",
    )
    .eq("user_id", user.id)
    .order("id");
  if (error) throw new Error(error.message);
  return data.map((r) => {
    const task = r.tasks as unknown as {
      name: string;
      project_id: number;
      projects: { name: string; user_id: string };
    };
    return {
      work_date: r.work_date as string,
      hours: r.hours as number,
      estimated_hours: r.estimated_hours as number | null,
      task_id: r.task_id as number,
      task: task.name,
      project_id: task.project_id,
      project: task.projects.name,
      project_user_id: task.projects.user_id,
    };
  });
}

async function projectsOf(user: TestUser) {
  const { data, error } = await adminClient()
    .from("projects")
    .select("id, name")
    .eq("user_id", user.id)
    .order("id");
  if (error) throw new Error(error.message);
  return data;
}

describe("POST /api/effort（GAS からの取り込み）", () => {
  describe("認証", () => {
    it("AC-effort-ingest-gas-01: 正しい API キーとユーザーのメールアドレスなら、JWT なしで 201 になり、そのユーザーの工数として保存する", async () => {
      const user = await createTestUser();
      const res = await ingest(user.email, EFFORT_TEXT);

      expect(res.status, await res.clone().text()).toBe(201);
      expect(await res.json()).toEqual({
        message: "Effort data processed and saved successfully",
      });
      expect(await workRecordsOf(user)).toEqual([
        expect.objectContaining({
          work_date: DATE,
          hours: 1.5,
          estimated_hours: 2,
          task: "設計",
          project: "GAS の案件",
          project_user_id: user.id,
        }),
      ]);
    });

    it("AC-effort-ingest-gas-01: メールアドレスの大文字小文字は区別しない", async () => {
      const user = await createTestUser();
      const res = await ingest(user.email.toUpperCase(), EFFORT_TEXT);

      expect(res.status, await res.clone().text()).toBe(201);
      expect(await workRecordsOf(user)).toHaveLength(1);
    });

    it.each([
      ["Authorization が無い", {}],
      ["Bearer で始まらない", { Authorization: "Basic test-api-key" }],
      ["API キーが違う", { Authorization: "Bearer wrong-api-key" }],
    ])("AC-effort-ingest-gas-02: %s と 401", async (_label, headers) => {
      const user = await createTestUser();
      const res = await callApi("/api/effort", {
        method: "POST",
        headers,
        body: { date: DATE, email: user.email, effort: EFFORT_TEXT },
      });

      expect(res.status).toBe(401);
      expect(await errorOf(res)).toBe("Unauthorized");
      expect(await workRecordsOf(user)).toEqual([]);
    });

    it("AC-effort-ingest-gas-02 / INV-1: ユーザーのアクセストークン（JWT）では登録できない", async () => {
      const user = await createTestUser();
      const res = await callApi("/api/effort", {
        method: "POST",
        user,
        body: { date: DATE, email: user.email, effort: EFFORT_TEXT },
      });

      expect(res.status).toBe(401);
      expect(await workRecordsOf(user)).toEqual([]);
    });

    it("INV-2: API キーが違えば、存在しないメールアドレスでも 400 ではなく 401（ユーザーの有無を漏らさない）", async () => {
      const res = await callApi("/api/effort", {
        method: "POST",
        bearer: "wrong-api-key",
        body: {
          date: DATE,
          email: "nobody@example.test",
          effort: EFFORT_TEXT,
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("入力の検証", () => {
    it("AC-effort-ingest-gas-03: 日付の形が違うと 400。メッセージは「<項目>: <検証のメッセージ>」", async () => {
      const user = await createTestUser();
      const res = await ingest(user.email, EFFORT_TEXT, "2026/10/13");

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toMatch(/^date: /);
    });

    it("AC-effort-ingest-gas-03: 項目が複数違うと、メッセージを「 | 」でつなぐ", async () => {
      const res = await callApi("/api/effort", {
        method: "POST",
        bearer: testEnv().API_KEY,
        body: { date: "x", email: "not-an-email" },
      });

      expect(res.status).toBe(400);
      const parts: string[] = (await errorOf(res)).split(" | ");
      expect(parts.map((m) => m.split(":")[0]).sort()).toEqual([
        "date",
        "effort",
        "email",
      ]);
    });

    it("AC-effort-ingest-gas-03: メールアドレスに当たるユーザーがいないと 400 User not found", async () => {
      const res = await ingest("nobody@example.test", EFFORT_TEXT);

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe("User not found");
    });

    it("AC-effort-ingest-gas-07: 読めるタスクの行が 1 つも無いと 400 で、何も保存しない", async () => {
      const user = await createTestUser();
      const res = await ingest(user.email, "■案件A\n・設計:[2]<1>");

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe(
        "工数の値が不正です。登録件数が0件でした。",
      );
      expect(await projectsOf(user)).toEqual([]);
    });
  });

  describe("保存", () => {
    it("AC-effort-ingest-gas-04: 同じ内容の行は 2 行になり、同じ日付で送り直すと上書きせずに足す", async () => {
      const user = await createTestUser();
      const text = "■案件A\n・設計：[2]<1>\n・設計：[2]<1>";

      expect((await ingest(user.email, text)).status).toBe(201);
      expect(await workRecordsOf(user)).toHaveLength(2);

      expect((await ingest(user.email, text)).status).toBe(201);
      const records = await workRecordsOf(user);
      expect(records).toHaveLength(4);
      // 案件とタスクは使い回す
      expect(new Set(records.map((r) => r.task_id)).size).toBe(1);
      expect(await projectsOf(user)).toHaveLength(1);
    });

    it("AC-effort-ingest-gas-05: 既にある案件とタスクは名前で探して使い回し、無いものだけ作る", async () => {
      const user = await createTestUser();
      await ingest(user.email, "■案件A\n・設計：[]<1>");
      const [first] = await workRecordsOf(user);

      await ingest(user.email, "■案件A\n・設計：[]<1>\n・実装：[]<2>");
      const records = await workRecordsOf(user);

      expect(records.map((r) => [r.project_id, r.task])).toEqual([
        [first.project_id, "設計"],
        [first.project_id, "設計"],
        [first.project_id, "実装"],
      ]);
      expect(records[1].task_id).toBe(first.task_id);
    });

    it("AC-effort-ingest-gas-05 / INV-3: 同じ名前の案件が他人にあっても、自分の案件を作って付ける", async () => {
      const other = await createTestUser();
      const user = await createTestUser();
      await ingest(other.email, "■共通の案件\n・設計：[]<1>");

      await ingest(user.email, "■共通の案件\n・設計：[]<1>");

      const [mine] = await workRecordsOf(user);
      const [theirs] = await workRecordsOf(other);
      expect(mine.project_user_id).toBe(user.id);
      expect(mine.project_id).not.toBe(theirs.project_id);
      expect(mine.task_id).not.toBe(theirs.task_id);
    });

    it("AC-effort-ingest-gas-05: 1 回の送信の中では、大文字小文字だけが違う名前を最初のものにまとめる（既知の落とし穴）", async () => {
      const user = await createTestUser();
      await ingest(
        user.email,
        "■ABC\n・Review：[]<1>\n・review：[]<2>\n■abc\n・設計：[]<3>",
      );

      expect(await projectsOf(user)).toEqual([
        expect.objectContaining({ name: "ABC" }),
      ]);
      expect((await workRecordsOf(user)).map((r) => r.task)).toEqual([
        "Review",
        "Review",
        "設計",
      ]);
    });

    it("AC-effort-ingest-gas-05: 別々の送信なら、大文字小文字だけが違う名前は別の案件になる", async () => {
      const user = await createTestUser();
      await ingest(user.email, "■ABC\n・設計：[]<1>");
      await ingest(user.email, "■abc\n・設計：[]<1>");

      expect((await projectsOf(user)).map((p) => p.name)).toEqual([
        "ABC",
        "abc",
      ]);
    });

    it("AC-effort-ingest-gas-05: 新しく作った案件とタスクは、応答の直後の GET /api/projects に出る", async () => {
      const user = await createTestUser();
      await ingest(user.email, "■GAS の案件\n・設計：[]<1>");
      await ingest(user.email, "■GAS の案件\n・テスト：[]<1>");

      const res = await callApi("/api/projects", { user });
      const body = JSON.stringify(await res.json());
      expect(body).toContain("GAS の案件");
      expect(body).toContain("設計");
      expect(body).toContain("テスト");
    });

    it.each([
      ["単位の付いた値は先頭の数値", "[2h]<1.5h>", 1.5, 2],
      ["カンマの小数は前の整数", "[1,5]<2,5>", 2, 1],
      ["空の見積は NULL、空の実績は 0", "[]<>", 0, null],
      ["数値でない見積は NULL、実績は 0", "[abc]<xyz>", 0, null],
      ["負の値もそのまま", "[-1]<-2>", -2, -1],
    ])(
      "AC-effort-ingest-gas-06: %s",
      async (_label, values, hours, estimated) => {
        const user = await createTestUser();
        const res = await ingest(user.email, `■案件A\n・設計：${values}`);

        expect(res.status, await res.clone().text()).toBe(201);
        const [record] = await workRecordsOf(user);
        expect(record.hours).toBe(hours);
        expect(record.estimated_hours).toBe(estimated);
      },
    );

    it("AC-effort-ingest-gas-07: 読めない行は読み飛ばし、読めた行だけ保存して 201", async () => {
      const user = await createTestUser();
      const res = await ingest(
        user.email,
        "・先頭：[]<1>\n■案件A\n・設計:[]<1>\n・実装：[]<2>\n■\n・後ろ：[]<3>",
      );

      expect(res.status).toBe(201);
      expect((await workRecordsOf(user)).map((r) => r.task)).toEqual(["実装"]);
    });

    it("AC-effort-ingest-gas-08: 完了メールの設定が有効でも、メールを送らない", async () => {
      const user = await createTestUser();
      const { error } = await adminClient()
        .from("user_settings")
        .insert({ user_id: user.id, notify_effort_email: true });
      if (error) throw new Error(error.message);

      const res = await ingest(user.email, EFFORT_TEXT);

      expect(res.status).toBe(201);
      expect(sentMails).toEqual([]);
    });
  });
});
