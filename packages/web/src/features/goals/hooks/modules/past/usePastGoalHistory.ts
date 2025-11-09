import { useGoalHistory } from "@/services/goals";
import type { GoalHistoryQuery } from "@shared/schemas/goals";

interface UsePastGoalHistoryOptions {
  query: GoalHistoryQuery | null;
  onError: (error: unknown) => void;
}

export const usePastGoalHistory = ({
  query,
  onError,
}: UsePastGoalHistoryOptions) => {
  const {
    data: goalHistory,
    error: goalHistoryError,
    isLoading,
  } = useGoalHistory(query);

  if (goalHistoryError) {
    onError(goalHistoryError);
  }

  return {
    goalHistory,
    isLoading: Boolean(query) && isLoading,
  };
};
