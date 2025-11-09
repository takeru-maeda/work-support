import { useEffect, useMemo } from "react";
import dayjs from "dayjs";

import { usePreviousWeekProgress } from "@/services/goals";
import { showErrorToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import {
  calculateGoalSummaries,
  type GoalProgressSummary,
} from "@shared/utils/goalProgress";
import type { Goal } from "@/features/goals/types";

interface PreviousWeekSummaryResult {
  previousSummary: GoalProgressSummary | null;
}

export const usePreviousWeekSummary = (
  goals: Goal[],
): PreviousWeekSummaryResult => {
  const query = useMemo(() => {
    if (goals.length === 0) return null;
    return {
      referenceDate: dayjs().format("YYYY-MM-DD"),
    };
  }, [goals]);

  const { data: previousWeekProgress, error: previousWeekError } =
    usePreviousWeekProgress(query);

  useEffect(() => {
    if (!previousWeekError) return;
    const message =
      "前週の進捗取得に失敗しました。時間を空けて再度お試しください。";
    showErrorToast(message);
    void reportUiError(previousWeekError, {
      message: "Failed to fetch previous week goal progress",
    });
  }, [previousWeekError]);

  const previousSummary: GoalProgressSummary | null = useMemo(() => {
    if (!previousWeekProgress || goals.length === 0) return null;

    const mappedProgress = goals.map((goal) => {
      const matched = previousWeekProgress.progress.find(
        (item) => item.goal_id === goal.id,
      );
      return {
        weight: goal.weight,
        progress: matched?.progress ?? goal.progress,
      };
    });

    return calculateGoalSummaries(mappedProgress);
  }, [goals, previousWeekProgress]);

  return { previousSummary };
};
