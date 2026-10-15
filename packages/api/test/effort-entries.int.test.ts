import { describe, expect, it } from "vitest";

import { adminClient, callApi, createTestUser } from "./helpers";
import { sentMails } from "./setup";

import type { TestUser } from "./helpers";

// 工数の登録（POST /api/effort/entries）、完了メール、案件とタスクの候補（GET /api/projects）。
// docs/specs/effort-entry/spec.md。メールの日付は本番の Workers と同じ UTC で整形する（vitest.shared.ts）
const DATE = "2026-10-13";

interface Entry {
  project_id?: number | null;
  project_name?: string | null;
  task_id?: number | null;
  task_name?: string | null;
  estimated_hours?: number | null;
  hours?: number;
}

const entry = (overrides: Entry = {}): Entry => ({
  project_id: null,
  project_name: "案件A",
  task_id: null,
  task_name: "設計",
  estimated_hours: null,
  hours: 1,
  ...overrides,
});

function submit(
  user: TestUser,
  entries: Entry[],
  memo: string | null = null,
  date: string = DATE,
) {
  return callApi("/api/effort/entries", {
    method: "POST",
    user,
    body: { date, entries, memo },
  });
}

interface Saved {
  entry_id: number;
  project_id: number;
  task_id: number;
  hours: number;
  estimated_hours: number | null;
}

async function savedOf(res: Response): Promise<Saved[]> {
  expect(res.status, await res.clone().text()).toBe(201);
  return ((await res.json()) as { saved: Saved[] }).saved;
}

async function errorOf(res: Response): Promise<string> {
  return ((await res.json()) as { error: string }).error;
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

async function workRecordsOf(user: TestUser) {
  const { data, error } = await adminClient()
    .from("work_records")
    .select("work_date, hours, estimated_hours, task_id")
    .eq("user_id", user.id)
    .order("id");
  if (error) throw new Error(error.message);
  return data;
}

describe("POST /api/effort/entries", () => {
  describe("入力", () => {
    it.each([
      ["entries が無い", { date: DATE }],
      ["日付の形が違う", { date: "2026/10/13", entries: [entry()] }],
      ["実績が無い", { date: DATE, entries: [entry({ hours: undefined })] }],
      [
        "実績が数値でない",
        { date: DATE, entries: [{ ...entry(), hours: "1" }] },
      ],
    ])(
      "AC-effort-entry-01: %s と 400（検証の既定の形）",
      async (_label, body) => {
        const user = await createTestUser();
        const res = await callApi("/api/effort/entries", {
          method: "POST",
          user,
          body,
        });

        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ success: false });
      },
    );

    it("AC-effort-entry-01: トークンが無ければ 401", async () => {
      const res = await callApi("/api/effort/entries", {
        method: "POST",
        body: { date: DATE, entries: [entry()] },
      });

      expect(res.status).toBe(401);
    });

    it.each([
      ["entries が空", [], "工数の値が不正です。登録件数が0件でした。"],
      [
        "見積が負",
        [entry({ estimated_hours: -1 })],
        "見積工数は0以上を指定してください。",
      ],
      [
        "実績が負",
        [entry({ hours: -1 })],
        "工数の時間は0以上を指定してください。",
      ],
    ])("AC-effort-entry-05: %s なら 400", async (_label, entries, message) => {
      const user = await createTestUser();
      const res = await submit(user, entries);

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe(message);
    });
  });

  describe("保存", () => {
    it("AC-effort-entry-02: 要素ごとに 1 行を保存し、201 で保存した行を返す（時間は小数第 2 位に丸める）", async () => {
      const user = await createTestUser();
      const saved = await savedOf(
        await submit(user, [
          entry({ estimated_hours: 2.345, hours: 1.555 }),
          entry({ task_name: "実装", hours: 0 }),
        ]),
      );

      expect(saved).toEqual([
        {
          entry_id: expect.any(Number),
          project_id: expect.any(Number),
          task_id: expect.any(Number),
          hours: 1.56,
          estimated_hours: 2.35,
        },
        {
          entry_id: expect.any(Number),
          project_id: saved[0].project_id,
          task_id: expect.any(Number),
          hours: 0,
          estimated_hours: null,
        },
      ]);
      expect(await workRecordsOf(user)).toEqual([
        {
          work_date: DATE,
          hours: 1.56,
          estimated_hours: 2.35,
          task_id: saved[0].task_id,
        },
        {
          work_date: DATE,
          hours: 0,
          estimated_hours: null,
          task_id: saved[1].task_id,
        },
      ]);
    });

    it("AC-effort-entry-03: project_id があれば、その案件を使い、project_name は見ない", async () => {
      const user = await createTestUser();
      const [first] = await savedOf(await submit(user, [entry()]));

      const [second] = await savedOf(
        await submit(user, [
          entry({ project_id: first.project_id, project_name: "違う名前" }),
        ]),
      );

      expect(second.project_id).toBe(first.project_id);
      expect((await projectsOf(user)).map((p) => p.name)).toEqual(["案件A"]);
    });

    it("AC-effort-entry-03 / INV-1: 他人の案件の project_id は 400", async () => {
      const other = await createTestUser();
      const user = await createTestUser();
      const [theirs] = await savedOf(await submit(other, [entry()]));

      const res = await submit(user, [
        entry({ project_id: theirs.project_id }),
      ]);

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe("指定した案件が見つかりませんでした。");
    });

    it("AC-effort-entry-03: 名前は前後の空白を除いて、大文字小文字を区別して探し、無ければ作る", async () => {
      const user = await createTestUser();
      const [first] = await savedOf(
        await submit(user, [entry({ project_name: "ABC" })]),
      );

      const [same] = await savedOf(
        await submit(user, [entry({ project_name: "  ABC  " })]),
      );
      const [other] = await savedOf(
        await submit(user, [entry({ project_name: "abc" })]),
      );

      expect(same.project_id).toBe(first.project_id);
      expect(other.project_id).not.toBe(first.project_id);
      expect((await projectsOf(user)).map((p) => p.name)).toEqual([
        "ABC",
        "abc",
      ]);
    });

    it("AC-effort-entry-03: 1 回の送信の中では、大文字小文字だけが違う名前を最初の案件にまとめる", async () => {
      const user = await createTestUser();
      const saved = await savedOf(
        await submit(user, [
          entry({ project_name: "ABC", task_name: "設計" }),
          entry({ project_name: "abc", task_name: "実装" }),
        ]),
      );

      expect(saved[1].project_id).toBe(saved[0].project_id);
      expect(await projectsOf(user)).toHaveLength(1);
    });

    it("AC-effort-entry-03 / INV-1: 他人の同じ名前の案件は使わない", async () => {
      const other = await createTestUser();
      const user = await createTestUser();
      const [theirs] = await savedOf(await submit(other, [entry()]));

      const [mine] = await savedOf(await submit(user, [entry()]));

      expect(mine.project_id).not.toBe(theirs.project_id);
      expect(mine.task_id).not.toBe(theirs.task_id);
    });

    it("AC-effort-entry-03 / 04: 新しく作る案件・タスクの名前が空なら 400", async () => {
      const user = await createTestUser();

      const noProject = await submit(user, [entry({ project_name: "  " })]);
      expect(noProject.status).toBe(400);
      expect(await errorOf(noProject)).toBe(
        "新規案件を作成する場合は案件名が必要です。",
      );

      const noTask = await submit(user, [entry({ task_name: null })]);
      expect(noTask.status).toBe(400);
      expect(await errorOf(noTask)).toBe(
        "新規タスクを作成する場合はタスク名が必要です。",
      );
    });

    it("AC-effort-entry-04: task_id があれば決めた案件の中で探し、別の案件のタスクなら 400", async () => {
      const user = await createTestUser();
      const [a] = await savedOf(await submit(user, [entry()]));
      const [b] = await savedOf(
        await submit(user, [entry({ project_name: "案件B", task_name: "別" })]),
      );

      const [reused] = await savedOf(
        await submit(user, [
          entry({
            project_id: a.project_id,
            task_id: a.task_id,
            task_name: null,
          }),
        ]),
      );
      expect(reused.task_id).toBe(a.task_id);

      const res = await submit(user, [
        entry({ project_id: a.project_id, task_id: b.task_id }),
      ]);
      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe("指定したタスクが見つかりませんでした。");
    });

    it("AC-effort-entry-06: 同じ日付で送り直すと行を足し、同じ案件・タスクの 2 行もまとめない", async () => {
      const user = await createTestUser();
      await savedOf(await submit(user, [entry(), entry()]));
      await savedOf(await submit(user, [entry()]));

      const records = await workRecordsOf(user);
      expect(records).toHaveLength(3);
      expect(new Set(records.map((r) => r.task_id)).size).toBe(1);
    });

    it("AC-effort-entry-07 / INV-2: 新しく作った案件とタスクは、応答の直後の候補に出る", async () => {
      const user = await createTestUser();
      await savedOf(await submit(user, [entry()]));
      await savedOf(
        await submit(user, [
          entry({ project_name: "案件A", task_name: "実装" }),
        ]),
      );

      const res = await callApi("/api/projects", { user });
      const body = JSON.stringify(await res.json());
      expect(body).toContain("設計");
      expect(body).toContain("実装");
    });
  });

  describe("完了メール", () => {
    it("AC-effort-entry-09 / 10: 設定の行が無くても送り、件名と本文は決まった形", async () => {
      const user = await createTestUser();
      await savedOf(
        await submit(
          user,
          [
            entry({
              project_name: "案件A",
              task_name: "設計",
              estimated_hours: 2,
              hours: 2.5,
            }),
            entry({ project_name: "案件A", task_name: "実装", hours: 1 }),
            entry({
              project_name: "案件B",
              task_name: "打合せ",
              estimated_hours: 1,
              hours: 0.33,
            }),
          ],
          "  メモ  ",
        ),
      );

      expect(sentMails).toEqual([
        {
          to: user.email,
          subject: "2026/10/13 工数を登録しました",
          apikey: "test-api-key",
          body: [
            "【日付】",
            "2026/10/13",
            "",
            "【工数】",
            "■案件A",
            "・設計",
            "　見積：2h   実績：2.5h（+0.5h）",
            "・実装",
            "　見積：-   実績：1h",
            "",
            "■案件B",
            "・打合せ",
            "　見積：1h   実績：0.33h（-0.67h）",
            "",
            "",
            "【集計】",
            "■案件別",
            "・案件A",
            "　見積：2h   実績：3.5h（+0.5h）",
            "・案件B",
            "　見積：1h   実績：0.33h（-0.67h）",
            "",
            "■全体",
            "見積：3h   実績：3.83h（-0.17h）",
            "",
            "【メモ】",
            "メモ",
          ].join("\n"),
        },
      ]);
    });

    it("AC-effort-entry-10: 差分が 0 なら（±0h）。見積が 1 つも無ければ差分を付けず、メモが空なら【メモ】を付けない", async () => {
      const user = await createTestUser();
      await savedOf(
        await submit(
          user,
          [
            entry({ project_name: "案件A", estimated_hours: 1, hours: 1 }),
            entry({ project_name: "案件B", task_name: "x", hours: 2 }),
          ],
          "   ",
        ),
      );

      const { body } = sentMails[0] as { body: string };
      expect(body).toContain("・案件A\n　見積：1h   実績：1h（±0h）");
      expect(body).toContain("・案件B\n　見積：-   実績：2h\n");
      expect(body).not.toContain("【メモ】");
    });

    it.each([
      [false, 0],
      [true, 1],
    ])(
      "AC-effort-entry-09: 設定の notify_effort_email が %s なら %i 通",
      async (notify, count) => {
        const user = await createTestUser();
        const { error } = await adminClient()
          .from("user_settings")
          .insert({ user_id: user.id, notify_effort_email: notify });
        if (error) throw new Error(error.message);

        await savedOf(await submit(user, [entry()]));

        expect(sentMails).toHaveLength(count);
      },
    );

    it("AC-effort-entry-09: 保存に失敗したら送らない", async () => {
      const user = await createTestUser();

      await submit(user, [entry({ hours: -1 })]);

      expect(sentMails).toEqual([]);
    });
  });
});

describe("GET /api/projects", () => {
  it("AC-effort-entry-11: そのユーザーの案件とタスクを、どちらも ID の降順で返す。タスクの無い案件は tasks: []", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    await savedOf(await submit(other, [entry({ project_name: "他人の案件" })]));
    await savedOf(
      await submit(user, [
        entry({ project_name: "古い案件", task_name: "古いタスク" }),
        entry({ project_name: "古い案件", task_name: "新しいタスク" }),
      ]),
    );
    await savedOf(await submit(user, [entry({ project_name: "新しい案件" })]));
    const db = adminClient();
    const { error } = await db
      .from("projects")
      .insert({ user_id: user.id, name: "タスクの無い案件" });
    if (error) throw new Error(error.message);
    const refreshed = await db.rpc("refresh_projects_with_tasks_mv");
    if (refreshed.error) throw new Error(refreshed.error.message);

    const res = await callApi("/api/projects", { user });

    expect(res.status).toBe(200);
    const { projects } = (await res.json()) as {
      projects: { name: string; tasks: { name: string }[] }[];
    };
    expect(projects.map((p) => [p.name, p.tasks.map((t) => t.name)])).toEqual([
      ["タスクの無い案件", []],
      ["新しい案件", ["設計"]],
      ["古い案件", ["新しいタスク", "古いタスク"]],
    ]);
  });

  it("AC-effort-entry-11: トークンが無ければ 401", async () => {
    expect((await callApi("/api/projects")).status).toBe(401);
  });
});
