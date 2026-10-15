import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import { adminClient, callApi, createTestUser } from "./helpers";

import type { TestUser } from "./helpers";

// 週報（GET /api/reports/weekly。docs/specs/weekly-report/spec.md）。日付の計算は本番の Workers と同じ UTC で
// 確かめる（vitest.shared.ts）。期待値はリクエストの時点で変わるので、目標の期間は今日からの相対で作る
const LEARNING = "<学習状況(Udemy)>\n■\n>進捗率：% (+%)";

async function insertOne<T>(table: string, row: Record<string, unknown>) {
  const { data, error } = await adminClient()
    .from(table)
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as T;
}

/** タスクを作り、ID を返す */
async function seedTask(projectId: number, name: string) {
  return (
    await insertOne<{ id: number }>("tasks", { project_id: projectId, name })
  ).id;
}

async function seedProject(user: TestUser, name: string) {
  return (
    await insertOne<{ id: number }>("projects", { user_id: user.id, name })
  ).id;
}

async function seedWork(
  user: TestUser,
  taskId: number,
  workDate: string,
  hours: number,
) {
  await insertOne("work_records", {
    user_id: user.id,
    task_id: taskId,
    work_date: workDate,
    hours,
  });
}

interface GoalSeed {
  title: string;
  weight: number;
  progress: number;
  start_date?: string;
  end_date?: string;
}

async function seedGoal(user: TestUser, seed: GoalSeed) {
  return insertOne<{ id: number }>("goals", {
    user_id: user.id,
    content: "",
    start_date: "2026-10-01",
    end_date: "2026-12-31",
    ...seed,
  });
}

async function seedHistory(goalId: number, progress: number, at: dayjs.Dayjs) {
  await insertOne("goal_progress_histories", {
    goal_id: goalId,
    progress,
    recorded_at: at.toISOString(),
  });
}

async function report(user: TestUser, date: string): Promise<string> {
  const res = await callApi(`/api/reports/weekly?date=${date}`, { user });
  expect(res.status, await res.clone().text()).toBe(200);
  return ((await res.json()) as { weeklyReport: string }).weeklyReport;
}

/** 本文から「<目標進捗状況>」の節を取り出す */
const goalSection = (text: string) =>
  text.slice(text.indexOf("<目標進捗状況>"));

/** 今日を含む週の月曜 0:00（UTC） */
const mondayOfToday = () => {
  const today = dayjs().startOf("day");
  return today.subtract((today.day() + 6) % 7, "day");
};

/** 今日から 15 日前に始まる 30 日の期間（期待値は 15 ÷ 30 = 50.0%） */
const halfwayPeriod = () => {
  const start = dayjs().startOf("day").subtract(15, "day");
  return {
    start_date: start.format("YYYY-MM-DD"),
    end_date: start.add(30, "day").format("YYYY-MM-DD"),
  };
};

describe("GET /api/reports/weekly", () => {
  describe("入力と認証", () => {
    it.each([
      ["date が無い", ""],
      ["date の形が違う", "?date=2026/10/14"],
    ])("AC-weekly-report-01: %s と 400", async (_label, query) => {
      const user = await createTestUser();
      const res = await callApi(`/api/reports/weekly${query}`, { user });

      expect(res.status).toBe(400);
    });

    it("AC-weekly-report-01: トークンが無ければ 401", async () => {
      const res = await callApi("/api/reports/weekly?date=2026-10-14");

      expect(res.status).toBe(401);
    });

    it("AC-weekly-report-01 / INV-3: ほかのユーザーの工数と目標は混ざらない", async () => {
      const other = await createTestUser();
      const user = await createTestUser();
      const task = await seedTask(
        await seedProject(other, "他人の案件"),
        "作業",
      );
      await seedWork(other, task, "2026-10-13", 8);
      await seedGoal(other, { title: "他人の目標", weight: 100, progress: 50 });

      const text = await report(user, "2026-10-14");

      expect(text).not.toContain("他人");
      expect(text).toContain("合計：0h");
      expect(goalSection(text)).toBe("<目標進捗状況>\n検討中");
    });
  });

  describe("本文の形", () => {
    it("AC-weekly-report-03 / 06 / 07: 工数も目標も無い週は、決まった全文になる", async () => {
      const user = await createTestUser();

      expect(await report(user, "2026-10-14")).toBe(
        [
          "<日別業務状況>",
          "10/12(月)：在宅 0h",
          "10/13(火)：在宅 0h",
          "10/14(水)：在宅 0h",
          "10/15(木)：在宅 0h",
          "10/16(金)：在宅 0h",
          "平均：0h/日",
          "合計：0h",
          "",
          "",
          LEARNING,
          "",
          "",
          "<目標進捗状況>",
          "検討中",
        ].join("\n"),
      );
    });

    it.each([
      ["月曜", "2026-10-12"],
      ["日曜", "2026-10-18"],
    ])(
      "AC-weekly-report-02: %sを選ぶと、その日を含む月曜〜日曜の週になる",
      async (_label, date) => {
        const user = await createTestUser();

        const text = await report(user, date);

        expect(text).toContain("10/12(月)：在宅 0h");
        expect(text).toContain("10/16(金)：在宅 0h");
      },
    );
  });

  describe("工数", () => {
    it("AC-weekly-report-04 / 05: 日別は月〜金、合計は土日を含む週全体。案件とタスクは新しく作ったものが上", async () => {
      const user = await createTestUser();
      const p1 = await seedProject(user, "案件1");
      const p2 = await seedProject(user, "案件2");
      const design = await seedTask(p1, "設計");
      const impl = await seedTask(p1, "実装");
      const meeting = await seedTask(p2, "会議");
      await seedWork(user, design, "2026-10-12", 1.1);
      await seedWork(user, impl, "2026-10-12", 2.2);
      await seedWork(user, meeting, "2026-10-13", 1.5);
      await seedWork(user, design, "2026-10-17", 2.25); // 土曜
      await seedWork(user, design, "2026-10-19", 9); // 次の週の月曜（入らない）
      await seedWork(user, design, "2026-10-11", 9); // 前の週の日曜（入らない）

      const text = await report(user, "2026-10-14");

      expect(text.slice(0, text.indexOf(LEARNING))).toBe(
        [
          "<日別業務状況>",
          // 日ごとの時間は丸めない（既知の落とし穴）
          "10/12(月)：在宅 3.3000000000000003h",
          "10/13(火)：在宅 1.5h",
          "10/14(水)：在宅 0h",
          "10/15(木)：在宅 0h",
          "10/16(金)：在宅 0h",
          // 合計 7.05（土曜を含む）÷ 工数のある平日 2 日
          "平均：3.5h/日",
          "合計：7.1h",
          "",
          "",
          "<案件別業務状況>",
          "■案件2（合計：1.5h）",
          ">・会議：1.5h",
          "",
          "■案件1（合計：5.55h）",
          ">・実装：2.2h",
          ">・設計：3.35h",
          "",
          "",
          "",
        ].join("\n"),
      );
    });

    it("AC-weekly-report-04: 平均と合計は小数第 1 位にし、整数なら小数点を付けない", async () => {
      const user = await createTestUser();
      const task = await seedTask(await seedProject(user, "案件"), "作業");
      await seedWork(user, task, "2026-10-12", 8);
      await seedWork(user, task, "2026-10-13", 7);
      await seedWork(user, task, "2026-10-14", 7.5);

      const text = await report(user, "2026-10-14");

      expect(text).toContain("平均：7.5h/日\n合計：22.5h");
    });
  });

  describe("目標", () => {
    it("AC-weekly-report-08 / 09 / 10: 全体の 4 行と目標ごとの行を、重みの降順で出す", async () => {
      const user = await createTestUser();
      const monday = mondayOfToday();
      const a = await seedGoal(user, {
        title: "目標A",
        weight: 60,
        progress: 60,
        ...halfwayPeriod(),
      });
      await seedGoal(user, {
        title: "目標B",
        weight: 40,
        progress: 100,
        ...halfwayPeriod(),
      });
      // 週の始まりの値は、月曜 0:00 より前のいちばん新しい履歴（B は履歴が無いので 0）
      await seedHistory(a.id, 30, monday.subtract(3, "day"));
      await seedHistory(a.id, 40, monday.subtract(1, "minute"));
      await seedHistory(a.id, 55, monday.add(1, "hour"));

      const text = await report(user, dayjs().format("YYYY-MM-DD"));

      expect(goalSection(text)).toBe(
        [
          "<目標進捗状況>",
          "=============================",
          "全体",
          // 単純平均 80（週の始まり 20）、加重 76（週の始まり 24）、期待値 50
          ">進捗率：80%(+60%)",
          ">加重達成率：76%(+52%)",
          ">期待値：50%(↑26%)",
          "=============================",
          "",
          "■目標A[60]",
          ">進捗率：60%(+20%)",
          "",
          "■目標B[40]",
          ">進捗率：100%(+100%)【達成】",
        ].join("\n"),
      );
    });

    it("AC-weekly-report-08: 単純平均が 100 なら「全体【達成】」。重みと進捗率は丸めずに出す", async () => {
      const user = await createTestUser();
      await seedGoal(user, {
        title: "目標",
        weight: 33.33,
        progress: 100,
        ...halfwayPeriod(),
      });

      const section = goalSection(
        await report(user, dayjs().format("YYYY-MM-DD")),
      );

      expect(section).toContain("全体【達成】");
      expect(section).toContain("■目標[33.33]\n>進捗率：100%(+100%)【達成】");
    });

    it("AC-weekly-report-09: 差分が 0 以下なら何も付けない", async () => {
      const user = await createTestUser();
      const goal = await seedGoal(user, {
        title: "目標",
        weight: 100,
        progress: 30,
        ...halfwayPeriod(),
      });
      await seedHistory(goal.id, 40, mondayOfToday().subtract(1, "day"));

      const section = goalSection(
        await report(user, dayjs().format("YYYY-MM-DD")),
      );

      expect(section).toContain(">進捗率：30%\n>加重達成率：30%\n");
      expect(section).toContain("■目標[100]\n>進捗率：30%");
    });

    it.each([
      ["期待値より低ければ ↓ と差の絶対値", 20, ">期待値：50%(↓30%)"],
      ["期待値と同じなら →0%", 50, ">期待値：50%(→0%)"],
    ])("AC-weekly-report-10: %s", async (_label, progress, line) => {
      const user = await createTestUser();
      await seedGoal(user, {
        title: "目標",
        weight: 100,
        progress,
        ...halfwayPeriod(),
      });

      const section = goalSection(
        await report(user, dayjs().format("YYYY-MM-DD")),
      );

      expect(section).toContain(line);
    });

    it("AC-weekly-report-10: 期間が過ぎていれば期待値は 100 で頭打ち", async () => {
      const user = await createTestUser();
      await seedGoal(user, {
        title: "目標",
        weight: 100,
        progress: 100,
        start_date: "2026-01-01",
        end_date: "2026-10-12",
      });

      const section = goalSection(await report(user, "2026-10-14"));

      expect(section).toContain(">期待値：100%(→0%)");
    });

    it("AC-weekly-report-07: 期間がその週と重ならない目標は対象にしない。重みの合計が 0 なら「検討中」", async () => {
      const user = await createTestUser();
      await seedGoal(user, {
        title: "前の期間",
        weight: 100,
        progress: 50,
        start_date: "2026-07-01",
        end_date: "2026-10-11",
      });
      await seedGoal(user, {
        title: "次の期間",
        weight: 100,
        progress: 50,
        start_date: "2026-10-19",
        end_date: "2026-12-31",
      });
      expect(goalSection(await report(user, "2026-10-14"))).toBe(
        "<目標進捗状況>\n検討中",
      );

      await seedGoal(user, {
        title: "重み 0",
        weight: 0,
        progress: 50,
        start_date: "2026-10-01",
        end_date: "2026-12-31",
      });
      expect(goalSection(await report(user, "2026-10-14"))).toBe(
        "<目標進捗状況>\n検討中",
      );
    });

    it("AC-weekly-report-07: 期間の境目（終了日が月曜、開始日が日曜）の目標は対象にする", async () => {
      const user = await createTestUser();
      await seedGoal(user, {
        title: "月曜に終わる",
        weight: 50,
        progress: 10,
        start_date: "2026-07-01",
        end_date: "2026-10-12",
      });
      await seedGoal(user, {
        title: "日曜に始まる",
        weight: 50,
        progress: 0,
        start_date: "2026-10-18",
        end_date: "2026-12-31",
      });

      const section = goalSection(await report(user, "2026-10-14"));

      expect(section).toContain("■月曜に終わる[50]");
      expect(section).toContain("■日曜に始まる[50]");
    });
  });
});
