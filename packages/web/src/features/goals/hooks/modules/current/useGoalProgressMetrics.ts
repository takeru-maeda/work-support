import { useMemo } from "react";

import {
  calculateGoalSummaries,
  type GoalProgressSummary,
} from "@shared/utils/goalProgress";
import type { Goal } from "@/features/goals/types";

interface UseGoalProgressMetricsOptions {
  goals: Goal[];
  previousSummary: GoalProgressSummary | null;
}

interface UseGoalProgressMetricsResult {
  weightedProgressSum: number;
  overallProgress: number;
  overallProgressDiff: number;
  weightedProgressDiff: number;
}

export const useGoalProgressMetrics = ({
  goals,
  previousSummary,
}: UseGoalProgressMetricsOptions): UseGoalProgressMetricsResult => {
  const currentSummary: GoalProgressSummary | null = useMemo(
    () => calculateGoalSummaries(goals),
    [goals],
  );

  const weightedProgressSum: number =
    currentSummary?.weightedAchievementRate ?? 0;
  const overallProgress: number = currentSummary?.simpleAverageProgress ?? 0;

  const overallProgressDiff: number =
    overallProgress -
    (previousSummary?.simpleAverageProgress ?? overallProgress);
  const weightedProgressDiff: number =
    weightedProgressSum -
    (previousSummary?.weightedAchievementRate ?? weightedProgressSum);

  return {
    weightedProgressSum,
    overallProgress,
    overallProgressDiff,
    weightedProgressDiff,
  };
};
