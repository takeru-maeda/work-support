import { useMemo } from "react";

import type { NewGoal } from "@/features/goals/types";

interface UseAddGoalMetricsResult {
  totalWeight: number;
  isWeightValid: boolean;
  isWeightExceeded: boolean;
}

export const useAddGoalMetrics = (
  goals: NewGoal[],
): UseAddGoalMetricsResult => {
  const totalWeight: number = useMemo(
    () => goals.reduce((sum, goal) => sum + (goal.weight || 0), 0),
    [goals],
  );

  const isWeightValid: boolean =
    totalWeight === 100 && goals.every((goal) => goal.weight > 0);
  const isWeightExceeded: boolean = totalWeight > 100;

  return {
    totalWeight,
    isWeightValid,
    isWeightExceeded,
  };
};
