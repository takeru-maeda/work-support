import { useCallback, useState } from "react";

import { deleteGoal } from "@/services/goals";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import type { Goal } from "@/features/goals/types";

interface UseGoalDeletionOptions {
  mutateGoals: () => Promise<Goal[] | undefined>;
}

interface UseGoalDeletionResult {
  deleteTarget: Goal | null;
  setDeleteTarget: (goal: Goal | null) => void;
  requestRemoveGoal: (goal: Goal) => void;
  confirmDelete: (goal: Goal) => Promise<void>;
  isDeleting: boolean;
}

export const useGoalDeletion = ({
  mutateGoals,
}: UseGoalDeletionOptions): UseGoalDeletionResult => {
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const requestRemoveGoal = useCallback((goal: Goal) => {
    setDeleteTarget(goal);
  }, []);

  const confirmDelete = useCallback(
    async (goal: Goal) => {
      setIsDeleting(true);
      try {
        await deleteGoal(goal.id);
        showSuccessToast("目標を削除しました");
        setDeleteTarget(null);
        await mutateGoals();
      } catch (error) {
        showErrorToast(
          "目標の削除に失敗しました。時間を空けて再度お試しください。",
        );
        await reportUiError(error, {
          message: "Failed to delete goal",
          clientContext: { goalId: goal.id },
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [mutateGoals],
  );

  return {
    deleteTarget,
    setDeleteTarget,
    requestRemoveGoal,
    confirmDelete,
    isDeleting,
  };
};
