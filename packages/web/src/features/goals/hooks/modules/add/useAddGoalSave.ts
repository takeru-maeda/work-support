import { useCallback, useState } from "react";
import { format } from "date-fns";

import { createGoal } from "@/services/goals";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import type { NewGoal } from "@/features/goals/types";

interface UseAddGoalSaveOptions {
  goals: NewGoal[];
  periodStart?: Date;
  periodEnd?: Date;
  validatePeriod: (start?: Date, end?: Date) => string | null;
  setPeriodError: (error: string | null) => void;
  mutateGoals: () => Promise<unknown>;
  onSuccess: () => void;
  clearDraft: () => void;
}

interface UseAddGoalSaveResult {
  handleSave: () => Promise<void>;
  isSaving: boolean;
}

export const useAddGoalSave = ({
  goals,
  periodStart,
  periodEnd,
  validatePeriod,
  setPeriodError,
  mutateGoals,
  onSuccess,
  clearDraft,
}: UseAddGoalSaveOptions): UseAddGoalSaveResult => {
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = useCallback(async () => {
    const validGoals: NewGoal[] = goals.filter(
      (goal) => goal.name.trim() && goal.weight > 0,
    );

    const error: string | null = validatePeriod(periodStart, periodEnd);
    if (error) {
      setPeriodError(error);
      return;
    }

    if (validGoals.length === 0 || !periodStart || !periodEnd) {
      showErrorToast("有効な目標を入力してください。");
      return;
    }

    setIsSaving(true);
    const startDate = format(periodStart, "yyyy-MM-dd");
    const endDate = format(periodEnd, "yyyy-MM-dd");

    try {
      for (const goal of validGoals) {
        await createGoal({
          title: goal.name,
          content: goal.content,
          weight: goal.weight,
          start_date: startDate,
          end_date: endDate,
        });
      }
      await mutateGoals();
      showSuccessToast("目標を保存しました");
      clearDraft();
      onSuccess();
    } catch (error) {
      showErrorToast(
        "目標の保存に失敗しました。時間を空けて再度お試しください。",
      );
      await reportUiError(error, {
        message: "Failed to create goals",
        clientContext: {
          goalCount: validGoals.length,
          startDate,
          endDate,
        },
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    clearDraft,
    goals,
    mutateGoals,
    onSuccess,
    periodEnd,
    periodStart,
    setPeriodError,
    validatePeriod,
  ]);

  return {
    handleSave,
    isSaving,
  };
};
