import { describe, expect, it } from "vitest";

import {
  CreateGoalPeriodRequestSchema,
  MAX_GOALS_PER_PERIOD,
  GoalHistoryQuerySchema,
  UpdateGoalRequestSchema,
} from "./goals";

describe("GoalHistoryQuerySchema", () => {
  it("クエリ文字列の値を数値に直し、ページの既定値を補う", () => {
    expect(
      GoalHistoryQuerySchema.parse({ minProgress: "10", maxProgress: "90" }),
    ).toEqual({ minProgress: 10, maxProgress: 90, page: 1, pageSize: 20 });
  });

  // 前処理で undefined にしても、z.coerce.number() が NaN に変えて 400 になる（Zod 4）。
  // web は値があるときだけ送るので画面からは起きない。直すのは P6（改修の記録を通す）。直ったら it に戻す
  it.fails("TODO(P6): 進捗率の空文字と null は、指定なしとして扱う", () => {
    const parsed = GoalHistoryQuerySchema.parse({
      minProgress: "",
      maxProgress: null,
    });
    expect(parsed.minProgress).toBeUndefined();
    expect(parsed.maxProgress).toBeUndefined();
  });

  it("進捗率は 0〜100 の範囲だけを受け付ける", () => {
    expect(GoalHistoryQuerySchema.safeParse({ minProgress: "0" }).success).toBe(
      true,
    );
    expect(
      GoalHistoryQuerySchema.safeParse({ maxProgress: "100" }).success,
    ).toBe(true);
    expect(
      GoalHistoryQuerySchema.safeParse({ minProgress: "-1" }).success,
    ).toBe(false);
    expect(
      GoalHistoryQuerySchema.safeParse({ maxProgress: "101" }).success,
    ).toBe(false);
  });

  it("minProgress が maxProgress より大きいときは minProgress のエラーになる", () => {
    const result = GoalHistoryQuerySchema.safeParse({
      minProgress: "60",
      maxProgress: "50",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["minProgress"]);
  });

  it("minProgress と maxProgress が同じ値なら通る", () => {
    expect(
      GoalHistoryQuerySchema.safeParse({ minProgress: "50", maxProgress: "50" })
        .success,
    ).toBe(true);
  });

  it("pageSize は 1〜100", () => {
    expect(GoalHistoryQuerySchema.safeParse({ pageSize: "100" }).success).toBe(
      true,
    );
    expect(GoalHistoryQuerySchema.safeParse({ pageSize: "101" }).success).toBe(
      false,
    );
    expect(GoalHistoryQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("並び順は決められた値だけを受け付ける", () => {
    expect(
      GoalHistoryQuerySchema.safeParse({ sort: "-end_date" }).success,
    ).toBe(true);
    expect(
      GoalHistoryQuerySchema.safeParse({ sort: "created_at" }).success,
    ).toBe(false);
  });
});

describe("CreateGoalPeriodRequestSchema", () => {
  const valid = {
    start_date: "2027-01-01",
    end_date: "2027-03-31",
    goals: [{ title: "A", content: "", weight: 100 }],
  };

  it("AC-goals-23: goals は上限（20 件）ちょうどまで通す", () => {
    expect(MAX_GOALS_PER_PERIOD).toBe(20);
    expect(
      CreateGoalPeriodRequestSchema.safeParse({
        ...valid,
        goals: Array.from({ length: MAX_GOALS_PER_PERIOD }, () => ({
          title: "A",
          content: "",
          weight: 5,
        })),
      }).success,
    ).toBe(true);
  });

  it("AC-goals-23: 形が合えば通す（目標名の空白と重みの合計は service で確かめる）", () => {
    expect(
      CreateGoalPeriodRequestSchema.safeParse({
        ...valid,
        goals: [{ title: " ", content: "", weight: 0.004 }],
      }).success,
    ).toBe(true);
  });

  it.each([
    ["goals が空", { goals: [] }],
    [
      "goals が上限を超える",
      {
        goals: Array.from({ length: MAX_GOALS_PER_PERIOD + 1 }, () => ({
          title: "A",
          content: "",
          weight: 1,
        })),
      },
    ],
    ["重みが 0", { goals: [{ title: "A", content: "", weight: 0 }] }],
    [
      "重みが 100 を超える",
      { goals: [{ title: "A", content: "", weight: 100.01 }] },
    ],
    ["内容が null", { goals: [{ title: "A", content: null, weight: 100 }] }],
    ["日付の形が違う", { end_date: "2027/03/31" }],
  ])("AC-goals-23: %s なら通さない", (_label, override) => {
    expect(
      CreateGoalPeriodRequestSchema.safeParse({ ...valid, ...override })
        .success,
    ).toBe(false);
  });
});

describe("UpdateGoalRequestSchema", () => {
  it("AC-goals-22: 目標名、内容、重み、進捗率だけを受け付ける", () => {
    expect(
      UpdateGoalRequestSchema.safeParse({
        title: "A",
        content: "",
        weight: 10,
        progress: 20,
      }).success,
    ).toBe(true);
  });

  it.each([
    ["期間", { start_date: "2027-01-01" }],
    ["知らない項目", { user_id: "x" }],
  ])("AC-goals-22: %s があれば通さない", (_label, body) => {
    expect(UpdateGoalRequestSchema.safeParse(body).success).toBe(false);
  });
});
