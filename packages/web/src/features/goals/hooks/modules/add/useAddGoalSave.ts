import { format } from "date-fns";
import { useCallback, useState } from "react";

import { reportUiError } from "@/api/logs";
import { createGoalPeriod } from "@/features/goals/api/goals";
import type { NewGoal } from "@/features/goals/types";
import { getRejectedMessage } from "@/lib/apiError";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { GOAL_PERIOD_MESSAGES } from "@shared/utils/goalPeriod";

const SAVE_FAILED_MESSAGE =
  "目標の保存に失敗しました。時間を空けて再度お試しください。";

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
    const error: string | null = validatePeriod(periodStart, periodEnd);
    if (error) {
      setPeriodError(error);
      return;
    }
    // 保存のボタンは期間を選ぶまで押せない（AC-goals-11）
    if (!periodStart || !periodEnd) return;

    if (goals.some((goal) => !goal.name.trim())) {
      showErrorToast(GOAL_PERIOD_MESSAGES.titleRequired);
      return;
    }

    setIsSaving(true);
    const startDate = format(periodStart, "yyyy-MM-dd");
    const endDate = format(periodEnd, "yyyy-MM-dd");

    try {
      await createGoalPeriod({
        start_date: startDate,
        end_date: endDate,
        goals: goals.map((goal: NewGoal) => ({
          title: goal.name,
          content: goal.content,
          weight: goal.weight,
        })),
      });
      await mutateGoals();
      showSuccessToast("目標を保存しました");
      clearDraft();
      onSuccess();
    } catch (error) {
      const rejected: string | null = getRejectedMessage(error);
      showErrorToast(rejected ?? SAVE_FAILED_MESSAGE);
      // 別の画面や端末で先に期間が作られて断られたときは、現在の期間を取り直して期間の確認を今の状態にする
      if (rejected) void mutateGoals();
      await reportUiError(error, {
        message: "Failed to create goals",
        clientContext: {
          goalCount: goals.length,
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
