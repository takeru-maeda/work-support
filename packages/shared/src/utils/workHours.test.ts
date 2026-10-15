import { describe, expect, it } from "vitest";

import { isSavableWorkHours, MAX_WORK_HOURS_EXCLUSIVE } from "./workHours";

// 工数の時間の保存できる範囲（docs/specs/effort-entry/spec.md の AC-05、AC-17）
describe("isSavableWorkHours", () => {
  it.each([
    [0, true],
    [99.99, true],
    [99.994, true],
    [99.995, false],
    [100, false],
    [-0.01, false],
    [Number.NaN, false],
  ])(
    "%s は %s（小数第 2 位に丸めた値で 0 以上 100 未満）",
    (hours, expected) => {
      expect(isSavableWorkHours(hours)).toBe(expected);
    },
  );

  it("上限は 100", () => {
    expect(MAX_WORK_HOURS_EXCLUSIVE).toBe(100);
  });
});
