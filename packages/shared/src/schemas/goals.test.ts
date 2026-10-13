import { describe, expect, it } from "vitest";

import { GoalHistoryQuerySchema } from "./goals";

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
