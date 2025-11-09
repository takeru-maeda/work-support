import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import { updateGoal } from "@/services/goals";
import {
  useGoalsData,
} from "@/features/goals/hooks/modules/current/useGoalsData";
import {
  useGoalsEditingState,
} from "@/features/goals/hooks/modules/current/useGoalsEditingState";
import {
  useGoalContentDialog,
} from "@/features/goals/hooks/modules/current/useGoalContentDialog";
import {
  useGoalDeletion,
} from "@/features/goals/hooks/modules/current/useGoalDeletion";
import {
  useGoalProgressMetrics,
} from "@/features/goals/hooks/modules/current/useGoalProgressMetrics";
import {
  usePreviousWeekSummary,
} from "@/features/goals/hooks/modules/current/usePreviousWeekSummary";
import type {
  Goal,
  GoalSortField,
  SortDirection,
} from "@/features/goals/types";

interface UseGoalsTableManagerResult {
  period: { start?: Date; end?: Date };
  goals: Goal[];
  sortedGoals: Goal[];
  totalWeight: number;
  weightedProgressSum: number;
  overallProgress: number;
  overallProgressDiff: number;
  weightedProgressDiff: number;
  sortField: GoalSortField;
  sortDirection: SortDirection;
  handleSort: (field: GoalSortField) => void;
  updateGoalName: (id: number, name: string) => void;
  updateGoalWeight: (id: number, weight: number) => void;
  updateGoalProgress: (id: number, progress: number) => void;
  requestRemoveGoal: (goal: Goal) => void;
  isWeightBalanced: boolean;
  openContentDialog: (goal: Goal) => void;
  handleContentDialogOpenChange: (open: boolean) => void;
  isContentDialogOpen: boolean;
  selectedGoal: Goal | null;
  editedContent: string;
  setEditedContent: (value: string) => void;
  updateGoalContent: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  saveChanges: () => Promise<void>;
  deleteTarget: Goal | null;
  setDeleteTarget: (goal: Goal | null) => void;
  confirmDelete: (goal: Goal) => Promise<void>;
  isDeleting: boolean;
  errorMessage: string | null;
  onNavigateToAdd: () => void;
}

export function useGoalsTableManager(): UseGoalsTableManagerResult {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const {
    goals: normalizedGoals,
    period,
    isLoading,
    errorMessage,
    mutateGoals,
  } = useGoalsData();

  const editingState = useGoalsEditingState(normalizedGoals);
  const { previousSummary } = usePreviousWeekSummary(normalizedGoals);
  const {
    weightedProgressSum,
    overallProgress,
    overallProgressDiff,
    weightedProgressDiff,
  } = useGoalProgressMetrics({
    goals: editingState.goals,
    previousSummary,
  });

  const {
    isContentDialogOpen,
    selectedGoal,
    editedContent,
    setEditedContent,
    openContentDialog,
    handleContentDialogOpenChange,
    updateGoalContent,
  } = useGoalContentDialog({
    onGoalUpdated: editingState.replaceGoal,
    mutateGoals,
    setGlobalSaving: setIsSaving,
  });

  const {
    deleteTarget,
    setDeleteTarget,
    requestRemoveGoal,
    confirmDelete,
    isDeleting,
  } = useGoalDeletion({ mutateGoals });

  const saveChanges = useCallback(async () => {
    if (editingState.changedGoals.length === 0) {
      showSuccessToast("更新対象はありません");
      return;
    }

    setIsSaving(true);
    try {
      for (const goal of editingState.changedGoals) {
        await updateGoal(goal.id, {
          title: goal.name,
          weight: goal.weight,
          progress: goal.progress,
        });
      }
      showSuccessToast("目標を更新しました");
      await mutateGoals();
    } catch (error) {
      showErrorToast(
        "目標の更新に失敗しました。時間を空けて再度お試しください。",
      );
      await reportUiError(error, {
        message: "Failed to update goals",
        clientContext: { goalIds: editingState.changedGoals.map((goal) => goal.id) },
      });
    } finally {
      setIsSaving(false);
    }
  }, [editingState.changedGoals, mutateGoals]);

  const onNavigateToAdd = useCallback(() => {
    navigate(ROUTES.goalsAdd);
  }, [navigate]);

  return {
    period,
    goals: editingState.goals,
    sortedGoals: editingState.sortedGoals,
    totalWeight: editingState.totalWeight,
    weightedProgressSum,
    overallProgress,
    overallProgressDiff,
    weightedProgressDiff,
    sortField: editingState.sortField,
    sortDirection: editingState.sortDirection,
    handleSort: editingState.handleSort,
    updateGoalName: editingState.updateGoalName,
    updateGoalWeight: editingState.updateGoalWeight,
    updateGoalProgress: editingState.updateGoalProgress,
    requestRemoveGoal,
    isWeightBalanced: editingState.isWeightBalanced,
    openContentDialog,
    handleContentDialogOpenChange,
    isContentDialogOpen,
    selectedGoal,
    editedContent,
    setEditedContent,
    updateGoalContent,
    isLoading,
    isSaving,
    hasChanges: editingState.hasChanges,
    saveChanges,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
    isDeleting,
    errorMessage,
    onNavigateToAdd,
  };
}
