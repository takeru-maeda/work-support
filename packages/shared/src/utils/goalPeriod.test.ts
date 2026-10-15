import { describe, expect, it } from "vitest";

import { goalPeriodOverlapMessage, toCents } from "./goalPeriod";

describe("toCents", () => {
  it.each([
    [100, 10000],
    [0, 0],
    [33.33, 3333],
    [33.334, 3333],
    [33.335, 3334],
    [0.005, 1],
    [0.004, 0],
    [99.995, 10000],
    // 浮動小数点の掛け算では 3333.5 になるが、送る 10 進の値は 33.334999… なので DB と同じく切り捨てる
    [33.33499999999999, 3333],
    [1e-7, 0],
  ])("%s → %s", (value, expected) => {
    expect(toCents(value)).toBe(expected);
  });
});

describe("goalPeriodOverlapMessage", () => {
  it("終了日を yyyy/MM/dd にして文に入れる", () => {
    expect(goalPeriodOverlapMessage("2026-12-31")).toBe(
      "開始日は既存目標の終了日（2026/12/31）より未来の日付を選択してください。",
    );
  });
});
