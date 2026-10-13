import { describe, expect, it } from "vitest";

import { calculateGoalSummaries } from "./goalProgress";

describe("calculateGoalSummaries", () => {
  it("目標が無いときは null", () => {
    expect(calculateGoalSummaries([])).toBeNull();
  });

  it("重みの合計が 0 のときは null（加重平均を出せない）", () => {
    expect(
      calculateGoalSummaries([
        { progress: 50, weight: 0 },
        { progress: 80, weight: 0 },
      ]),
    ).toBeNull();
  });

  it("単純平均と加重平均を、小数第 1 位に丸めて返す", () => {
    expect(
      calculateGoalSummaries([
        { progress: 100, weight: 70 },
        { progress: 0, weight: 30 },
      ]),
    ).toEqual({ simpleAverageProgress: 50, weightedAchievementRate: 70 });

    expect(
      calculateGoalSummaries([
        { progress: 10, weight: 1 },
        { progress: 20, weight: 1 },
        { progress: 20, weight: 1 },
      ]),
    ).toEqual({
      simpleAverageProgress: 16.7,
      weightedAchievementRate: 16.7,
    });
  });

  it("重みの合計が 100 でなくても、重みの比で加重平均を出す", () => {
    expect(
      calculateGoalSummaries([
        { progress: 40, weight: 1 },
        { progress: 80, weight: 3 },
      ]),
    ).toEqual({ simpleAverageProgress: 60, weightedAchievementRate: 70 });
  });
});
