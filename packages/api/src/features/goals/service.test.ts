import { describe, expect, it } from "vitest";

import {
  GOAL_PERIOD_MESSAGES,
  goalPeriodOverlapMessage as overlapMessage,
} from "../../../../shared/src/utils/goalPeriod";

import { checkGoalPeriod } from "./service";

import type { GoalPeriodCreateRequest } from "./types";

/**
 * 目標の期間の作成で、DB を読まずに決まる確認（docs/specs/goals/spec.md の AC-goals-23）。
 * DB を通る経路（作成、同時の送信、権限）は test/goals.int.test.ts で確かめる
 */
const { endBeforeStart, titleRequired, weightTotal } = GOAL_PERIOD_MESSAGES;

const periodOf = (
  weights: number[],
  override: Partial<GoalPeriodCreateRequest> = {},
): GoalPeriodCreateRequest => ({
  start_date: "2027-01-01",
  end_date: "2027-03-31",
  goals: weights.map((weight, index) => ({
    title: `目標${index + 1}`,
    content: "",
    weight,
  })),
  ...override,
});

describe("checkGoalPeriod", () => {
  it("AC-goals-23: すべて通れば空", () => {
    expect(checkGoalPeriod(periodOf([60, 40]), "2026-12-31")).toEqual([]);
  });

  it("AC-goals-23: 目標が無ければ（現在の期間の終了日が無ければ）重なりは確かめない", () => {
    expect(
      checkGoalPeriod(
        periodOf([100], { start_date: "2000-01-01", end_date: "2000-01-02" }),
        undefined,
      ),
    ).toEqual([]);
  });

  it.each([
    ["終了日が開始日と同じ", { end_date: "2027-01-01" }],
    ["終了日が開始日より前", { end_date: "2026-12-31" }],
  ])("AC-goals-23: %s なら、終了日の文", (_label, override) => {
    expect(checkGoalPeriod(periodOf([100], override), undefined)).toEqual([
      endBeforeStart,
    ]);
  });

  it("AC-goals-23: 開始日が現在の期間の終了日と同じなら、その終了日（yyyy/MM/dd）を添えた文。翌日なら通す", () => {
    expect(
      checkGoalPeriod(
        periodOf([100], { start_date: "2026-12-31" }),
        "2026-12-31",
      ),
    ).toEqual([overlapMessage("2026-12-31")]);
    expect(overlapMessage("2026-12-31")).toBe(
      "開始日は既存目標の終了日（2026/12/31）より未来の日付を選択してください。",
    );
    expect(
      checkGoalPeriod(
        periodOf([100], { start_date: "2027-01-01" }),
        "2026-12-31",
      ),
    ).toEqual([]);
  });

  it.each([["空"], ["半角の空白だけ"], ["全角の空白だけ"]])(
    "AC-goals-23: 目標名が%sなら、目標名の文",
    (label) => {
      const title = { 空: "", 半角の空白だけ: "  ", 全角の空白だけ: "　" }[
        label
      ] as string;
      const period = periodOf([50, 50]);
      period.goals[1].title = title;

      expect(checkGoalPeriod(period, undefined)).toEqual([titleRequired]);
    },
  );

  it.each([
    [
      "1 行ずつ丸めると 99.99（33.334 / 33.333 / 33.333）",
      [33.334, 33.333, 33.333],
      [weightTotal],
    ],
    [
      "1 行ずつ丸めると 100.00（33.335 / 33.33 / 33.334）",
      [33.335, 33.33, 33.334],
      [],
    ],
    ["合計が 100.01", [50, 50.01], [weightTotal]],
    [
      "DB と同じく送る 10 進の値で丸める（33.33499999999999 は 33.33。合計 99.99）",
      [33.33499999999999, 33.33, 33.33],
      [weightTotal],
    ],
    ["丸めると 0.00 になる行がある", [100, 0.004], [weightTotal]],
    ["0.005 は 0.01 に丸める", [99.99, 0.005], []],
  ])("AC-goals-23: 重みが%s", (_label, weights, expected) => {
    expect(checkGoalPeriod(periodOf(weights), undefined)).toEqual(expected);
  });

  it("AC-goals-23: 誤りは 終了日 → 重なり → 目標名 → 重み の順に並べる", () => {
    const period = periodOf([10], {
      start_date: "2026-11-01",
      end_date: "2026-10-01",
    });
    period.goals[0].title = "";

    expect(checkGoalPeriod(period, "2026-12-31")).toEqual([
      endBeforeStart,
      overlapMessage("2026-12-31"),
      titleRequired,
      weightTotal,
    ]);
  });
});
