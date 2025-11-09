import { useCallback, useState } from "react";

import { updateGoal } from "@/services/goals";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import type { Goal } from "@/features/goals/types";

interface UseGoalContentDialogOptions {
  onGoalUpdated: (goal: Goal) => void;
  mutateGoals: () => Promise<Goal[] | undefined>;
  setGlobalSaving: (saving: boolean) => void;
}

interface UseGoalContentDialogResult {
  isContentDialogOpen: boolean;
  selectedGoal: Goal | null;
  editedContent: string;
  setEditedContent: (value: string) => void;
  openContentDialog: (goal: Goal) => void;
  handleContentDialogOpenChange: (open: boolean) => void;
  updateGoalContent: () => Promise<void>;
}

export const useGoalContentDialog = ({
  onGoalUpdated,
  mutateGoals,
  setGlobalSaving,
}: UseGoalContentDialogOptions): UseGoalContentDialogResult => {
  const [isContentDialogOpen, setIsContentDialogOpen] =
    useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editedContent, setEditedContent] = useState<string>("");

  const openContentDialog = useCallback((goal: Goal) => {
    setSelectedGoal(goal);
    setEditedContent(goal.content ?? "");
    setIsContentDialogOpen(true);
  }, []);

  const handleContentDialogOpenChange = useCallback((open: boolean) => {
    setIsContentDialogOpen(open);
    if (!open) {
      setSelectedGoal(null);
    }
  }, []);

  const updateGoalContent = useCallback(async () => {
    if (!selectedGoal) return;

    setGlobalSaving(true);
    try {
      const updatedGoal: Goal = await updateGoal(selectedGoal.id, {
        content: editedContent,
      });
      onGoalUpdated(updatedGoal);
      showSuccessToast("内容を更新しました");
      await mutateGoals();
    } catch (error) {
      showErrorToast(
        "内容の更新に失敗しました。時間を空けて再度お試しください。",
      );
      await reportUiError(error, {
        message: "Failed to update goal content",
        clientContext: { goalId: selectedGoal.id },
      });
    } finally {
      setGlobalSaving(false);
      setIsContentDialogOpen(false);
      setSelectedGoal(null);
    }
  }, [
    editedContent,
    mutateGoals,
    onGoalUpdated,
    selectedGoal,
    setGlobalSaving,
  ]);

  return {
    isContentDialogOpen,
    selectedGoal,
    editedContent,
    setEditedContent,
    openContentDialog,
    handleContentDialogOpenChange,
    updateGoalContent,
  };
};
