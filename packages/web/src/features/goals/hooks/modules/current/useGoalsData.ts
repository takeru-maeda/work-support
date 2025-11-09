import { useEffect, useMemo, useState } from "react";

import { useCurrentGoals } from "@/services/goals";
import { showErrorToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import type { Goal } from "@/features/goals/types";

interface GoalsDataResult {
  goals: Goal[];
  period: { start?: Date; end?: Date };
  isLoading: boolean;
  errorMessage: string | null;
  mutateGoals: () => Promise<Goal[] | undefined>;
}

export const useGoalsData = (): GoalsDataResult => {
  const {
    data: currentGoals,
    error,
    isLoading,
    mutate: mutateGoals,
  } = useCurrentGoals();
  const goals: Goal[] = currentGoals ?? [];
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!error) {
      setErrorMessage(null);
      return;
    }
    const message =
      "目標の取得に失敗しました。時間を空けて再度お試しください。";
    setErrorMessage(message);
    showErrorToast(message);
    void reportUiError(error, { message: "Failed to fetch current goals" });
  }, [error]);

  const period = useMemo(() => {
    if (goals.length === 0) return {};
    const start = goals.reduce<Date>(
      (min, goal) => (goal.startDate < min ? goal.startDate : min),
      goals[0].startDate,
    );
    const end = goals.reduce<Date>(
      (max, goal) => (goal.endDate > max ? goal.endDate : max),
      goals[0].endDate,
    );
    return { start, end };
  }, [goals]);

  return {
    goals,
    period,
    isLoading,
    errorMessage,
    mutateGoals,
  };
};
