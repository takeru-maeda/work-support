import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import { useGoalsData } from "@/features/goals/hooks/modules/current/useGoalsData";
import { useGoalDraft } from "@/features/goals/hooks/modules/add/useGoalDraft";
import { useAddGoalMetrics } from "@/features/goals/hooks/modules/add/useAddGoalMetrics";
import { useAddGoalPeriodValidation } from "@/features/goals/hooks/modules/add/useAddGoalPeriodValidation";
import { useAddGoalSave } from "@/features/goals/hooks/modules/add/useAddGoalSave";
import type { NewGoal } from "../types";

interface UseAddGoalsManagerResult {
  periodStart: Date | undefined;
  periodEnd: Date | undefined;
  setPeriodStart: (date?: Date) => void;
  setPeriodEnd: (date?: Date) => void;
  goals: NewGoal[];
  addGoal: () => void;
  removeGoal: (id: string) => void;
  updateGoal: (
    id: string,
    field: keyof Omit<NewGoal, "id">,
    value: string | number,
  ) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  totalWeight: number;
  isWeightValid: boolean;
  isWeightExceeded: boolean;
  periodError: string | null;
  isPeriodValid: boolean;
  latestGoalEndDate?: Date;
  isSaving: boolean;
}

export function useAddGoalsManager(): UseAddGoalsManagerResult {
  const navigate = useNavigate();
  const { goals: currentGoals, mutateGoals } = useGoalsData();

  const latestGoalEndDate: Date | undefined = useMemo(() => {
    if (currentGoals.length === 0) {
      return undefined;
    }
    return currentGoals.reduce<Date>(
      (max, goal) => (goal.endDate > max ? goal.endDate : max),
      currentGoals[0].endDate,
    );
  }, [currentGoals]);

  const {
    periodStart,
    periodEnd,
    goals,
    setPeriodStart,
    setPeriodEnd,
    addGoal,
    removeGoal,
    updateGoal,
    clearDraft,
  } = useGoalDraft();

  const { totalWeight, isWeightValid, isWeightExceeded } =
    useAddGoalMetrics(goals);

  const {
    periodError,
    isPeriodValid,
    validatePeriod,
    setPeriodError,
  } = useAddGoalPeriodValidation({
    latestGoalEndDate,
    periodStart,
    periodEnd,
  });

  const { handleSave, isSaving } = useAddGoalSave({
    goals,
    periodStart,
    periodEnd,
    validatePeriod,
    setPeriodError,
    mutateGoals,
    clearDraft,
    onSuccess: () => navigate(ROUTES.goals),
  });

  const handleCancel = useCallback(() => {
    navigate(ROUTES.goals);
  }, [navigate]);

  return {
    periodStart,
    periodEnd,
    setPeriodStart,
    setPeriodEnd,
    goals,
    addGoal,
    removeGoal,
    updateGoal,
    handleSave,
    handleCancel,
    totalWeight,
    isWeightValid,
    isWeightExceeded,
    periodError,
    isPeriodValid,
    latestGoalEndDate,
    isSaving,
  };
}
