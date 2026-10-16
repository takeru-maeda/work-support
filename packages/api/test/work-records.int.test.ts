import { describe, expect, it } from "vitest";

import { callApi, createTestUser } from "./helpers";

import type { TestUser } from "./helpers";

// 工数一覧（GET /api/reports/work-records。docs/specs/effort-list/spec.md）
interface Item {
  id: number;
  date: string;
  project: string;
  project_id: number;
  task: string;
  task_id: number;
  estimated_hours: number | null;
  hours: number;
  diff: number | null;
}

interface ListResponse {
  items: Item[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

interface Seed {
  date: string;
  project: string;
  task: string;
  estimated?: number | null;
  hours: number;
}

/** 工数の登録の API で 1 行ずつ作る（案件とタスクは名前で使い回される） */
async function seed(user: TestUser, rows: Seed[]) {
  for (const row of rows) {
    const res = await callApi("/api/effort/entries", {
      method: "POST",
      user,
      body: {
        date: row.date,
        entries: [
          {
            project_id: null,
            project_name: row.project,
            task_id: null,
            task_name: row.task,
            estimated_hours: row.estimated ?? null,
            hours: row.hours,
          },
        ],
      },
    });
    expect(res.status, await res.clone().text()).toBe(201);
  }
}

async function list(user: TestUser, query = ""): Promise<ListResponse> {
  const res = await callApi(`/api/reports/work-records${query}`, { user });
  expect(res.status, await res.clone().text()).toBe(200);
  return (await res.json()) as ListResponse;
}

const ROWS: Seed[] = [
  {
    date: "2026-10-12",
    project: "案件B",
    task: "設計",
    estimated: 2,
    hours: 3,
  },
  {
    date: "2026-10-13",
    project: "案件A",
    task: "実装",
    estimated: 4,
    hours: 1.5,
  },
  { date: "2026-10-14", project: "案件A", task: "設計", hours: 2 },
  {
    date: "2026-10-15",
    project: "案件B",
    task: "会議",
    estimated: 1,
    hours: 1,
  },
];

describe("GET /api/reports/work-records", () => {
  it("AC-effort-list-01 / 03: 既定は日付の降順・1 ページ 20 件で、行と件数を返す", async () => {
    const user = await createTestUser();
    await seed(user, ROWS);

    const body = await list(user);

    expect(body.items.map((i) => i.date)).toEqual([
      "2026-10-15",
      "2026-10-14",
      "2026-10-13",
      "2026-10-12",
    ]);
    expect(body.items[3]).toEqual({
      id: expect.any(Number),
      date: "2026-10-12",
      project: "案件B",
      project_id: expect.any(Number),
      task: "設計",
      task_id: expect.any(Number),
      estimated_hours: 2,
      hours: 3,
      diff: 1,
    });
    expect(body.items[1]).toMatchObject({ estimated_hours: null, diff: null });
    expect(body.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 4,
      totalPages: 1,
    });
    expect(body).not.toHaveProperty("summary");
  });

  it("AC-effort-list-02: 期間は両端を含み、案件とタスクで絞れる", async () => {
    const user = await createTestUser();
    await seed(user, ROWS);
    const all = await list(user);
    const projectA = all.items.find((i) => i.project === "案件A")?.project_id;
    const design = all.items.find(
      (i) => i.project === "案件B" && i.task === "設計",
    )?.task_id;

    const period = await list(user, "?startDate=2026-10-13&endDate=2026-10-14");
    expect(period.items.map((i) => i.date)).toEqual([
      "2026-10-14",
      "2026-10-13",
    ]);

    const byProject = await list(user, `?projectId=${projectA}`);
    expect(byProject.items.map((i) => i.task)).toEqual(["設計", "実装"]);

    const byTask = await list(user, `?taskId=${design}`);
    expect(byTask.items.map((i) => i.date)).toEqual(["2026-10-12"]);

    const mismatch = await list(
      user,
      `?projectId=${projectA}&taskId=${design}`,
    );
    expect(mismatch.items).toEqual([]);
  });

  it("AC-effort-list-02: 0 と空文字は指定なしと同じ。負の数は通り 0 件", async () => {
    const user = await createTestUser();
    await seed(user, ROWS);

    expect((await list(user, "?projectId=0&taskId=")).meta.total).toBe(4);
    expect((await list(user, "?projectId=-1")).items).toEqual([]);
  });

  it("AC-effort-list-01: 開始日と終了日が同じなら通り、開始日が後なら 400", async () => {
    const user = await createTestUser();
    await seed(user, ROWS);

    expect(
      (await list(user, "?startDate=2026-10-13&endDate=2026-10-13")).meta.total,
    ).toBe(1);
    const res = await callApi(
      "/api/reports/work-records?startDate=2026-10-14&endDate=2026-10-13",
      { user },
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it.each([
    ["日付の形が違う", "?startDate=2026/10/13"],
    ["pageSize が 500 を超える", "?pageSize=501"],
    ["page が 0", "?page=0"],
    ["一覧に無い sort", "?sort=created_at"],
    ["projectId が整数でない", "?projectId=1.5"],
  ])("AC-effort-list-01: %s と 400", async (_label, query) => {
    const user = await createTestUser();
    const res = await callApi(`/api/reports/work-records${query}`, { user });

    expect(res.status).toBe(400);
  });

  it("AC-effort-list-01: トークンが無ければ 401", async () => {
    expect((await callApi("/api/reports/work-records")).status).toBe(401);
  });

  it("AC-effort-list-03: page と pageSize でめくり、totalPages は件数 ÷ pageSize の切り上げ", async () => {
    const user = await createTestUser();
    await seed(user, ROWS);

    const page2 = await list(user, "?page=2&pageSize=3");

    expect(page2.items.map((i) => i.date)).toEqual(["2026-10-12"]);
    expect(page2.meta).toEqual({
      page: 2,
      pageSize: 3,
      total: 4,
      totalPages: 2,
    });
  });

  it("AC-effort-list-03: 0 件なら totalPages は 0", async () => {
    const user = await createTestUser();

    expect((await list(user)).meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it.each([
    ["date", ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15"]],
    // 案件名 → タスク名 → 日付
    ["project", ["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-12"]],
    // タスク名 → 案件名 → 日付
    ["task", ["2026-10-15", "2026-10-13", "2026-10-14", "2026-10-12"]],
    ["hours", ["2026-10-15", "2026-10-13", "2026-10-14", "2026-10-12"]],
    // null は昇順で最後
    [
      "estimated_hours",
      ["2026-10-15", "2026-10-12", "2026-10-13", "2026-10-14"],
    ],
    // diff: 10/13 -2.5、10/15 0、10/12 +1、10/14 null
    ["diff", ["2026-10-13", "2026-10-15", "2026-10-12", "2026-10-14"]],
    // null は降順で最初
    ["-diff", ["2026-10-14", "2026-10-12", "2026-10-15", "2026-10-13"]],
  ])("AC-effort-list-04: sort=%s で並べる", async (sort, dates) => {
    const user = await createTestUser();
    await seed(user, ROWS);

    expect(
      (await list(user, `?sort=${sort}`)).items.map((i) => i.date),
    ).toEqual(dates);
  });

  it("AC-effort-list-02: ほかのユーザーの工数は出ない", async () => {
    const other = await createTestUser();
    const user = await createTestUser();
    await seed(other, ROWS);

    expect((await list(user)).items).toEqual([]);
    const theirs = await list(other);
    expect(
      (await list(user, `?projectId=${theirs.items[0].project_id}`)).items,
    ).toEqual([]);
  });
});
