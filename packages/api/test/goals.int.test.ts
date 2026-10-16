import { describe, expect, it } from "vitest";

import { validateGoalPeriod } from "../src/features/goals/service";

import { adminClient, browserClient, callApi, createTestUser } from "./helpers";

import type { TestUser } from "./helpers";

// 目標の API（docs/specs/goals/spec.md）。日付の計算は本番の Workers と同じ UTC で確かめる（vitest.shared.ts）
const NOT_FOUND = "Goal not found for the given user and id";

interface GoalSeed {
  title?: string;
  content?: string;
  start_date?: string;
  end_date?: string;
  weight?: number;
  progress?: number;
  created_at?: string;
}

interface GoalRow {
  id: number;
  title: string;
  content: string;
  start_date: string;
  end_date: string;
  weight: number;
  progress: number;
  created_at: string;
  updated_at: string;
}

/** DB に直接目標を作る（作成日や進捗率を決めて準備するため） */
async function seedGoal(user: TestUser, seed: GoalSeed = {}): Promise<GoalRow> {
  const { data, error } = await adminClient()
    .from("goals")
    .insert({
      user_id: user.id,
      title: "目標",
      content: "",
      start_date: "2026-10-01",
      end_date: "2026-12-31",
      weight: 50,
      progress: 0,
      ...seed,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GoalRow;
}

async function seedHistory(
  goalId: number,
  progress: number,
  recordedAt: string,
) {
  const { error } = await adminClient()
    .from("goal_progress_histories")
    .insert({ goal_id: goalId, progress, recorded_at: recordedAt });
  if (error) throw new Error(error.message);
}

async function historiesOf(goalId: number) {
  const { data, error } = await adminClient()
    .from("goal_progress_histories")
    .select("progress, recorded_at")
    .eq("goal_id", goalId)
    .order("id");
  if (error) throw new Error(error.message);
  return data;
}

async function json<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function errorOf(res: Response): Promise<string> {
  return (await json<{ error: string }>(res)).error;
}

describe("GET /api/goals/current", () => {
  it("AC-goals-01: 終了日がいちばん未来の目標を、開始日に関わらずすべて返す", async () => {
    const user = await createTestUser();
    await seedGoal(user, { title: "過去", end_date: "2026-09-30" });
    const a = await seedGoal(user, { title: "A", start_date: "2026-10-01" });
    const b = await seedGoal(user, { title: "B", start_date: "2026-11-01" });

    const res = await callApi("/api/goals/current", { user });

    expect(res.status).toBe(200);
    const { goals } = await json<{ goals: GoalRow[] }>(res);
    expect(goals.map((g) => g.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("AC-goals-01: 今日より前に終わった期間でも、いちばん未来の終了日なら返す", async () => {
    const user = await createTestUser();
    await seedGoal(user, { start_date: "2020-01-01", end_date: "2020-03-31" });

    const { goals } = await json<{ goals: GoalRow[] }>(
      await callApi("/api/goals/current", { user }),
    );

    expect(goals).toHaveLength(1);
  });

  it("AC-goals-01: 目標が無ければ空の配列", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/goals/current", { user });

    expect(await res.json()).toEqual({ goals: [] });
  });
});

describe("POST /api/goals/periods", () => {
  const PERIOD = { start_date: "2027-01-01", end_date: "2027-03-31" };
  const goalOf = (title: string, weight: number, content = "") => ({
    title,
    content,
    weight,
  });
  const body = {
    ...PERIOD,
    goals: [goalOf("目標A", 60, "内容A"), goalOf("目標B", 40)],
  };
  const END_BEFORE_START = "終了日は開始日より未来の日付を選択してください。";
  const TITLE_REQUIRED = "目標名を入力してください。";
  const WEIGHT_TOTAL = "重みの合計を100%にしてください。";
  const overlapMessage = (endDate: string) =>
    `開始日は既存目標の終了日（${endDate}）より未来の日付を選択してください。`;

  async function goalsOf(user: TestUser): Promise<GoalRow[]> {
    const { data, error } = await adminClient()
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("id");
    if (error) throw new Error(error.message);
    return data as GoalRow[];
  }

  async function post(user: TestUser, payload: unknown) {
    return callApi("/api/goals/periods", {
      method: "POST",
      user,
      body: payload,
    });
  }

  it("AC-goals-23: すべての目標を進捗率 0 で作り、201 で本文の順に返す。履歴は残さず、現在の目標になる", async () => {
    const user = await createTestUser();
    await seedGoal(user, { start_date: "2026-10-01", end_date: "2026-12-31" });

    const res = await post(user, body);

    expect(res.status, await res.clone().text()).toBe(201);
    const { created } = await json<{ created: GoalRow[] }>(res);
    expect(created).toEqual([
      expect.objectContaining({
        ...PERIOD,
        title: "目標A",
        content: "内容A",
        weight: 60,
        progress: 0,
      }),
      expect.objectContaining({ ...PERIOD, title: "目標B", weight: 40 }),
    ]);
    for (const goal of created) expect(await historiesOf(goal.id)).toEqual([]);
    const current = await json<{ goals: GoalRow[] }>(
      await callApi("/api/goals/current", { user }),
    );
    expect(current.goals.map((g) => g.id).sort()).toEqual(
      created.map((g) => g.id).sort(),
    );
  });

  it("AC-goals-23: 目標名は前後の空白を含めて入力のまま保存し、1 行ずつ丸めた重みの合計が 100.00 なら通す", async () => {
    const user = await createTestUser();
    const res = await post(user, {
      ...PERIOD,
      goals: [
        goalOf(" 目標A ", 33.334),
        goalOf("B", 33.333),
        goalOf("C", 33.333),
      ],
    });

    // 33.334 → 33.33、33.333 → 33.33 で合計 99.99 になるので 400
    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe(WEIGHT_TOTAL);

    const ok = await post(user, {
      ...PERIOD,
      goals: [
        goalOf(" 目標A ", 33.335),
        goalOf("B", 33.33),
        goalOf("C", 33.334),
      ],
    });
    expect(ok.status, await ok.clone().text()).toBe(201);
    const { created } = await json<{ created: GoalRow[] }>(ok);
    expect(created.map((g) => [g.title, g.weight])).toEqual([
      [" 目標A ", 33.34],
      ["B", 33.33],
      ["C", 33.33],
    ]);
  });

  it("AC-goals-23: 目標が無いユーザーは、期間の前後だけを確かめる", async () => {
    const user = await createTestUser();
    const res = await post(user, {
      ...body,
      start_date: "2000-01-01",
      end_date: "2000-01-02",
    });

    expect(res.status).toBe(201);
  });

  it("AC-goals-23: 他人の期間は、現在の期間に数えない", async () => {
    const other = await createTestUser();
    await seedGoal(other, { end_date: "2099-12-31" });
    const user = await createTestUser();

    expect((await post(user, body)).status).toBe(201);
  });

  it.each([
    ["終了日が開始日と同じ", { end_date: PERIOD.start_date }, END_BEFORE_START],
    ["終了日が開始日より前", { end_date: "2026-12-31" }, END_BEFORE_START],
    [
      "開始日が現在の期間の終了日と同じ",
      { start_date: "2026-12-31" },
      overlapMessage("2026/12/31"),
    ],
    [
      "目標名が空白だけ",
      { goals: [goalOf("A", 50), goalOf("　 ", 50)] },
      TITLE_REQUIRED,
    ],
    [
      "重みの合計が 100.01",
      { goals: [goalOf("A", 50), goalOf("B", 50.01)] },
      WEIGHT_TOTAL,
    ],
    [
      "DB と同じく送る 10 進の値で丸めると、合計が 99.99（33.33499999999999 / 33.33 / 33.33）",
      {
        goals: [
          goalOf("A", 33.33499999999999),
          goalOf("B", 33.33),
          goalOf("C", 33.33),
        ],
      },
      WEIGHT_TOTAL,
    ],
    [
      "丸めると 0.00 になる重みがある",
      { goals: [goalOf("A", 100), goalOf("B", 0.004)] },
      WEIGHT_TOTAL,
    ],
    [
      "誤りが複数あれば、決まった順の最初（終了日 → 重なり → 目標名 → 重み）",
      {
        start_date: "2026-11-01",
        end_date: "2026-10-01",
        goals: [goalOf("", 10)],
      },
      END_BEFORE_START,
    ],
    [
      "重なりと目標名と重みの誤りでは、重なり",
      { start_date: "2026-11-01", goals: [goalOf("", 10)] },
      overlapMessage("2026/12/31"),
    ],
    [
      "目標名と重みの誤りでは、目標名",
      { goals: [goalOf("", 10)] },
      TITLE_REQUIRED,
    ],
  ])(
    "AC-goals-23: %s と、その文の 400。何も作らない",
    async (_label, override, message) => {
      const user = await createTestUser();
      await seedGoal(user, {
        start_date: "2026-10-01",
        end_date: "2026-12-31",
      });

      const res = await post(user, { ...body, ...override });

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe(message);
      expect(await goalsOf(user)).toHaveLength(1);
    },
  );

  it.each([
    ["goals が空", { goals: [] }],
    [
      "goals が 21 件（上限は 20）",
      { goals: Array.from({ length: 21 }, (_, i) => goalOf(`目標${i}`, 1)) },
    ],
    ["日付の形が違う", { start_date: "2027/01/01" }],
    ["内容が null", { goals: [{ title: "A", content: null, weight: 100 }] }],
    ["内容が無い", { goals: [{ title: "A", weight: 100 }] }],
    ["重みが 0", { goals: [goalOf("A", 0), goalOf("B", 100)] }],
    ["重みが 100 を超える", { goals: [goalOf("A", 100.01)] }],
    [
      "目標名が文字列でない",
      { goals: [{ title: 1, content: "", weight: 100 }] },
    ],
  ])(
    "AC-goals-23: 形の誤り（%s）は入力の検証の 400。何も作らない",
    async (_label, override) => {
      const user = await createTestUser();

      const res = await post(user, { ...body, ...override });

      expect(res.status).toBe(400);
      expect(await json<{ success: boolean }>(res)).toMatchObject({
        success: false,
      });
      expect(await goalsOf(user)).toEqual([]);
    },
  );

  it("AC-goals-24: 同じ期間を同時に 2 回送ると、片方だけが 201、もう片方は先の期間の終了日を添えた 400", async () => {
    const user = await createTestUser();

    const responses = await Promise.all([post(user, body), post(user, body)]);

    const statuses = responses.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 400]);
    const rejected = responses.find((r) => r.status === 400);
    expect(await errorOf(rejected as Response)).toBe(
      overlapMessage("2027/03/31"),
    );
    expect(await goalsOf(user)).toHaveLength(2);
  });

  it("AC-goals-21 の廃止: POST /api/goals は無い（404）", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/goals", {
      method: "POST",
      user,
      body: { ...PERIOD, title: "A", content: "", weight: 100 },
    });

    expect(res.status).toBe(404);
    expect(await goalsOf(user)).toEqual([]);
  });

  it("AC-goals-24: DB の関数は、ロックの中で現在の期間と比べ直し、重なれば WG001 と終了日を返して何も作らない", async () => {
    const user = await createTestUser();
    await seedGoal(user, { start_date: "2026-10-01", end_date: "2026-12-31" });

    const { error } = await adminClient().rpc("create_goal_period", {
      p_user_id: user.id,
      p_start_date: "2026-12-31",
      p_end_date: "2027-03-31",
      p_goals: [goalOf("A", 100)],
    });

    expect(error).toMatchObject({ code: "WG001", details: "2026-12-31" });
    expect(await goalsOf(user)).toHaveLength(1);
  });

  it("validateGoalPeriod: 作らずに誤りを返し、この期間で編集できなくなる今の目標を返す", async () => {
    const user = await createTestUser();
    await seedGoal(user, { title: "過去", end_date: "2026-09-30" });
    const current = await seedGoal(user, { end_date: "2026-12-31" });

    const ok = await validateGoalPeriod(adminClient(), user.id, body);
    expect(ok.errors).toEqual([]);
    expect(ok.lockedGoals.map((g) => g.id)).toEqual([current.id]);

    const ng = await validateGoalPeriod(adminClient(), user.id, {
      ...body,
      start_date: "2026-12-01",
      goals: [goalOf("", 10)],
    });
    expect(ng.errors).toEqual([
      overlapMessage("2026/12/31"),
      TITLE_REQUIRED,
      WEIGHT_TOTAL,
    ]);
    expect(await goalsOf(user)).toHaveLength(2);
  });

  it("DB の関数は、anon と、ログインしたユーザーのキーからは呼べない（引数のユーザー ID で他人の目標を作れないように）", async () => {
    const user = await createTestUser();

    for (const client of [browserClient(), browserClient(user)]) {
      const { error } = await client.rpc("create_goal_period", {
        p_user_id: user.id,
        p_start_date: PERIOD.start_date,
        p_end_date: PERIOD.end_date,
        p_goals: [goalOf("A", 100)],
      });
      // 42501: 実行の権限が無い（関数が無いときの PGRST202 と区別する）
      expect(error?.code).toBe("42501");
    }
    expect(await goalsOf(user)).toEqual([]);
  });
});

describe("PUT /api/goals/:id", () => {
  it("AC-goals-06: 本文にある項目だけを変え、progress があれば更新後の値で履歴を 1 行残す", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user, {
      title: "元",
      weight: 40,
      progress: 10,
    });

    const before = Date.now();
    const res = await callApi(`/api/goals/${goal.id}`, {
      method: "PUT",
      user,
      body: { progress: 55.555 },
    });

    expect(res.status, await res.clone().text()).toBe(200);
    const { updated } = await json<{ updated: GoalRow }>(res);
    expect(updated).toMatchObject({ title: "元", weight: 40, progress: 55.56 });
    const histories = await historiesOf(goal.id);
    expect(histories).toHaveLength(1);
    expect(histories[0].progress).toBe(55.56);
    expect(Date.parse(histories[0].recorded_at)).toBeGreaterThanOrEqual(
      before - 5000,
    );
  });

  it("AC-goals-06: progress が変わっていなくても、本文にあれば履歴を残す", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user, { progress: 30 });

    await callApi(`/api/goals/${goal.id}`, {
      method: "PUT",
      user,
      body: { progress: 30 },
    });

    expect(await historiesOf(goal.id)).toHaveLength(1);
  });

  it("AC-goals-06: progress が無ければ履歴は残さない", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user);

    const res = await callApi(`/api/goals/${goal.id}`, {
      method: "PUT",
      user,
      body: { title: "新しい名前", weight: 12.345, content: "新しい内容" },
    });

    expect(res.status).toBe(200);
    expect((await json<{ updated: GoalRow }>(res)).updated).toMatchObject({
      title: "新しい名前",
      weight: 12.35,
      content: "新しい内容",
    });
    expect(await historiesOf(goal.id)).toEqual([]);
  });

  it("AC-goals-06: 本文が空なら、目標があっても 400", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user);

    const res = await callApi(`/api/goals/${goal.id}`, {
      method: "PUT",
      user,
      body: {},
    });

    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe(NOT_FOUND);
  });

  it("AC-goals-22: updated_at は作ったときのまま変わらない", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user);

    const res = await callApi(`/api/goals/${goal.id}`, {
      method: "PUT",
      user,
      body: { title: "新しい名前" },
    });

    const { updated } = await json<{ updated: GoalRow }>(res);
    expect(Date.parse(updated.updated_at)).toBe(Date.parse(goal.updated_at));
  });

  it.each([
    ["期間", { start_date: "2027-01-01", end_date: "2027-03-31" }],
    ["期間と一緒にほかの項目", { title: "新", end_date: "2027-03-31" }],
    ["知らない項目", { user_id: "00000000-0000-0000-0000-000000000000" }],
  ])(
    "AC-goals-22: %s を送ると入力の検証の 400 で、何も変えない",
    async (_label, body) => {
      const user = await createTestUser();
      const goal = await seedGoal(user);

      const res = await callApi(`/api/goals/${goal.id}`, {
        method: "PUT",
        user,
        body,
      });

      expect(res.status).toBe(400);
      expect(await json<{ success: boolean }>(res)).toMatchObject({
        success: false,
      });
      const { goals } = await json<{ goals: GoalRow[] }>(
        await callApi("/api/goals/current", { user }),
      );
      expect(goals).toEqual([
        expect.objectContaining({
          title: goal.title,
          start_date: goal.start_date,
          end_date: goal.end_date,
        }),
      ]);
    },
  );

  it.each([
    ["重みが 100 を超える", { weight: 101 }],
    ["進捗率が 100 を超える", { progress: 100.01 }],
    ["目標名が空", { title: "" }],
  ])("AC-goals-06: %s と 400", async (_label, body) => {
    const user = await createTestUser();
    const goal = await seedGoal(user);

    const res = await callApi(`/api/goals/${goal.id}`, {
      method: "PUT",
      user,
      body,
    });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/goals/:id", () => {
  it("AC-goals-08: 目標を消して 204。進捗の履歴も一緒に消える", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user);
    await seedHistory(goal.id, 10, "2026-10-05T00:00:00Z");

    const res = await callApi(`/api/goals/${goal.id}`, {
      method: "DELETE",
      user,
    });

    expect(res.status).toBe(204);
    const { goals } = await json<{ goals: GoalRow[] }>(
      await callApi("/api/goals/current", { user }),
    );
    expect(goals).toEqual([]);
    expect(await historiesOf(goal.id)).toEqual([]);
  });

  it("AC-goals-20: 無い目標を消すと 400", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/goals/999999999", {
      method: "DELETE",
      user,
    });

    expect(res.status).toBe(400);
    expect(await errorOf(res)).toBe(NOT_FOUND);
  });
});

describe("ユーザーの分離", () => {
  it("AC-goals-20 / INV-5: 他人の目標は読めず、変えられず（履歴も足されず）、消せない。どれも 400", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    const goal = await seedGoal(owner, { title: "本人の目標", progress: 10 });

    const current = await json<{ goals: GoalRow[] }>(
      await callApi("/api/goals/current", { user: other }),
    );
    expect(current.goals).toEqual([]);

    const put = await callApi(`/api/goals/${goal.id}`, {
      method: "PUT",
      user: other,
      body: { title: "書き換え", progress: 90 },
    });
    expect(put.status).toBe(400);
    expect(await errorOf(put)).toBe(NOT_FOUND);

    const del = await callApi(`/api/goals/${goal.id}`, {
      method: "DELETE",
      user: other,
    });
    expect(del.status).toBe(400);

    const history = await json<{ items: GoalRow[] }>(
      await callApi("/api/goals/history", { user: other }),
    );
    expect(history.items).toEqual([]);

    const { goals } = await json<{ goals: GoalRow[] }>(
      await callApi("/api/goals/current", { user: owner }),
    );
    expect(goals).toEqual([
      expect.objectContaining({ title: "本人の目標", progress: 10 }),
    ]);
    expect(await historiesOf(goal.id)).toEqual([]);
  });

  it.each([
    ["GET", "/api/goals/current"],
    ["POST", "/api/goals/periods"],
    ["PUT", "/api/goals/1"],
    ["DELETE", "/api/goals/1"],
    ["GET", "/api/goals/history"],
    ["GET", "/api/goals/progress/previous-week?referenceDate=2026-10-14"],
  ] as const)(
    "AC-goals-20: トークンが無ければ %s %s は 401",
    async (method, path) => {
      const res = await callApi(path, {
        method,
        body: method === "POST" || method === "PUT" ? {} : undefined,
      });

      expect(res.status).toBe(401);
    },
  );
});

describe("GET /api/goals/progress/previous-week", () => {
  interface PreviousWeek {
    referenceDate: string;
    previousWeekEnd: string;
    progress: {
      goal_id: number;
      progress: number;
      recorded_at: string;
      source: "history" | "goal";
    }[];
  }

  const previousWeek = async (user: TestUser, referenceDate: string) => {
    const res = await callApi(
      `/api/goals/progress/previous-week?referenceDate=${referenceDate}`,
      { user },
    );
    expect(res.status, await res.clone().text()).toBe(200);
    return json<PreviousWeek>(res);
  };

  it.each([
    ["月曜", "2026-10-12"],
    ["水曜", "2026-10-14"],
    ["日曜", "2026-10-18"],
  ])(
    "AC-goals-10: 基準日が%sなら、前の日曜日（2026-10-11）を previousWeekEnd にする",
    async (_label, referenceDate) => {
      const user = await createTestUser();
      const body = await previousWeek(user, referenceDate);

      expect(body).toEqual({
        referenceDate,
        previousWeekEnd: "2026-10-11",
        progress: [],
      });
    },
  );

  it("AC-goals-10: その日曜日の終わり（UTC）までの、いちばん新しい履歴の値を返す", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user, {
      progress: 80,
      created_at: "2026-10-01T00:00:00Z",
    });
    await seedHistory(goal.id, 10, "2026-10-04T00:00:00Z");
    await seedHistory(goal.id, 20, "2026-10-11T23:59:59Z");
    await seedHistory(goal.id, 70, "2026-10-12T00:00:00Z");

    const { progress } = await previousWeek(user, "2026-10-14");

    expect(progress).toEqual([
      {
        goal_id: goal.id,
        progress: 20,
        recorded_at: "2026-10-11",
        source: "history",
      },
    ]);
  });

  it("AC-goals-10: 履歴が無く、その日曜日の 0:00（UTC）より後に作った目標は 0", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user, {
      progress: 40,
      created_at: "2026-10-11T12:00:00Z",
    });

    const { progress } = await previousWeek(user, "2026-10-14");

    expect(progress).toEqual([
      {
        goal_id: goal.id,
        progress: 0,
        recorded_at: "2026-10-11",
        source: "goal",
      },
    ]);
  });

  it("AC-goals-10: 履歴が無く、それより前に作った目標は今の進捗率（既知の落とし穴。0 に直す予定）", async () => {
    const user = await createTestUser();
    const goal = await seedGoal(user, {
      progress: 40,
      created_at: "2026-10-01T00:00:00Z",
    });

    const { progress } = await previousWeek(user, "2026-10-14");

    expect(progress).toEqual([
      {
        goal_id: goal.id,
        progress: 40,
        recorded_at: "2026-10-11",
        source: "goal",
      },
    ]);
  });

  it("AC-goals-10: 現在の期間に限らず、すべての目標を goal_id の昇順で返す", async () => {
    const user = await createTestUser();
    const old = await seedGoal(user, {
      end_date: "2026-06-30",
      created_at: "2026-01-01T00:00:00Z",
    });
    const current = await seedGoal(user, {
      created_at: "2026-10-01T00:00:00Z",
    });

    const { progress } = await previousWeek(user, "2026-10-14");

    expect(progress.map((p) => p.goal_id)).toEqual([old.id, current.id]);
  });

  it("AC-goals-10: 基準日の形が違うと 400", async () => {
    const user = await createTestUser();
    const res = await callApi(
      "/api/goals/progress/previous-week?referenceDate=2026-1-1",
      { user },
    );

    expect(res.status).toBe(400);
  });
});

describe("GET /api/goals/history", () => {
  interface HistoryResponse {
    items: GoalRow[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
    aggregations: { totalCount: number };
  }

  const search = async (user: TestUser, params = "") => {
    const res = await callApi(`/api/goals/history${params}`, { user });
    expect(res.status, await res.clone().text()).toBe(200);
    return json<HistoryResponse>(res);
  };

  const titles = (body: HistoryResponse) => body.items.map((g) => g.title);

  it("AC-goals-15 / 16: 条件が無ければ、現在の期間も含めて終了日の降順で返す", async () => {
    const user = await createTestUser();
    await seedGoal(user, { title: "古い", end_date: "2026-03-31" });
    await seedGoal(user, { title: "現在", end_date: "2026-12-31" });
    await seedGoal(user, { title: "中間", end_date: "2026-06-30" });

    const body = await search(user);

    expect(titles(body)).toEqual(["現在", "中間", "古い"]);
    expect(body.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 3,
      totalPages: 1,
    });
    expect(body.aggregations).toEqual({ totalCount: 3 });
  });

  it("AC-goals-15: query は目標名か内容の部分一致で、大文字小文字を区別しない", async () => {
    const user = await createTestUser();
    await seedGoal(user, { title: "Sales を伸ばす", end_date: "2026-03-31" });
    await seedGoal(user, {
      title: "採用",
      content: "sales チームの採用",
      end_date: "2026-02-28",
    });
    await seedGoal(user, { title: "その他", end_date: "2026-01-31" });

    expect(titles(await search(user, "?query=SALES"))).toEqual([
      "Sales を伸ばす",
      "採用",
    ]);
  });

  it("AC-goals-15: query の % と _ はワイルドカードとして働く", async () => {
    const user = await createTestUser();
    await seedGoal(user, { title: "AxC", end_date: "2026-03-31" });
    await seedGoal(user, { title: "ABBC", end_date: "2026-02-28" });

    expect(titles(await search(user, "?query=A_C"))).toEqual(["AxC"]);
    expect(titles(await search(user, "?query=A%25C"))).toEqual(["AxC", "ABBC"]);
  });

  it("AC-goals-15: startDate は開始日の下限、endDate は終了日の上限（両端を含む）", async () => {
    const user = await createTestUser();
    await seedGoal(user, {
      title: "1",
      start_date: "2026-01-01",
      end_date: "2026-03-31",
    });
    await seedGoal(user, {
      title: "2",
      start_date: "2026-04-01",
      end_date: "2026-06-30",
    });
    await seedGoal(user, {
      title: "3",
      start_date: "2026-07-01",
      end_date: "2026-09-30",
    });

    expect(
      titles(await search(user, "?startDate=2026-04-01&endDate=2026-06-30")),
    ).toEqual(["2"]);
  });

  it("AC-goals-15: minProgress / maxProgress は両端を含む。min > max は 400", async () => {
    const user = await createTestUser();
    for (const p of [10, 50, 90]) {
      await seedGoal(user, {
        title: String(p),
        progress: p,
        end_date: `2026-0${p / 10}-01`,
      });
    }

    expect(
      titles(await search(user, "?minProgress=50&maxProgress=90")),
    ).toEqual(["90", "50"]);

    const res = await callApi(
      "/api/goals/history?minProgress=60&maxProgress=50",
      {
        user,
      },
    );
    expect(res.status).toBe(400);
  });

  it.each([
    ["title", ["A", "B", "C"]],
    ["-title", ["C", "B", "A"]],
    ["weight", ["C", "A", "B"]],
    ["-progress", ["A", "C", "B"]],
    ["start_date", ["B", "A", "C"]],
  ])("AC-goals-16: sort=%s で並べる", async (sort, expected) => {
    const user = await createTestUser();
    await seedGoal(user, {
      title: "A",
      weight: 20,
      progress: 90,
      start_date: "2026-02-01",
    });
    await seedGoal(user, {
      title: "B",
      weight: 30,
      progress: 10,
      start_date: "2026-01-01",
    });
    await seedGoal(user, {
      title: "C",
      weight: 10,
      progress: 50,
      start_date: "2026-03-01",
    });

    expect(titles(await search(user, `?sort=${sort}`))).toEqual(expected);
  });

  it("AC-goals-16: page と pageSize でめくり、meta に総数とページ数を返す", async () => {
    const user = await createTestUser();
    for (let i = 1; i <= 5; i++) {
      await seedGoal(user, { title: String(i), end_date: `2026-0${i}-01` });
    }

    const body = await search(user, "?page=2&pageSize=2");

    expect(titles(body)).toEqual(["3", "2"]);
    expect(body.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
    });
    expect(body.aggregations).toEqual({ totalCount: 5 });
  });

  it.each([
    ["一覧に無い sort", "?sort=created_at"],
    ["pageSize が 100 を超える", "?pageSize=101"],
    ["page が 0", "?page=0"],
    ["進捗率が 100 を超える", "?maxProgress=101"],
  ])("AC-goals-16: %s は 400", async (_label, params) => {
    const user = await createTestUser();
    const res = await callApi(`/api/goals/history${params}`, { user });

    expect(res.status).toBe(400);
  });
});
