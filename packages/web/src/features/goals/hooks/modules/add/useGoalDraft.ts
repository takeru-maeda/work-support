import { useCallback, useEffect, useMemo, useState } from "react";

import { getGoalAddDraftStorageKey } from "@/features/goals/storageKeys";
import type { NewGoal, NewGoalDraft } from "@/features/goals/types";

interface GoalDraftState {
  periodStart?: Date;
  periodEnd?: Date;
  goals: NewGoal[];
}

interface UseGoalDraftResult extends GoalDraftState {
  setPeriodStart: (date?: Date) => void;
  setPeriodEnd: (date?: Date) => void;
  addGoal: () => void;
  removeGoal: (id: string) => void;
  updateGoal: (
    id: string,
    field: keyof Omit<NewGoal, "id">,
    value: string | number,
  ) => void;
  clearDraft: () => void;
}

const createDefaultGoal = (index: number): NewGoal => ({
  id: `draft-${index}`,
  name: "",
  content: "",
  weight: 0,
});

const loadDraftFromStorage = (storageKey: string): GoalDraftState => {
  if (typeof window === "undefined") {
    return {
      periodStart: undefined,
      periodEnd: undefined,
      goals: [createDefaultGoal(1)],
    };
  }

  const raw: string | null = window.localStorage.getItem(storageKey);
  if (!raw) {
    return {
      periodStart: undefined,
      periodEnd: undefined,
      goals: [createDefaultGoal(1)],
    };
  }

  try {
    const parsed = JSON.parse(raw) as NewGoalDraft;
    const periodStart: Date | undefined = parsed.periodStart
      ? new Date(parsed.periodStart)
      : undefined;
    const periodEnd: Date | undefined = parsed.periodEnd
      ? new Date(parsed.periodEnd)
      : undefined;
    const goals: NewGoal[] = parsed.goals?.map((goal, index) => ({
      id: goal.id ?? `draft-${index + 1}`,
      name: goal.name ?? "",
      content: goal.content ?? "",
      weight: Number.isFinite(goal.weight) ? goal.weight : 0,
    })) ?? [createDefaultGoal(1)];

    return {
      periodStart,
      periodEnd,
      goals,
    };
  } catch {
    return {
      periodStart: undefined,
      periodEnd: undefined,
      goals: [createDefaultGoal(1)],
    };
  }
};

export const useGoalDraft = (): UseGoalDraftResult => {
  const storageKey: string = getGoalAddDraftStorageKey();
  const draft: GoalDraftState = useMemo(
    () => loadDraftFromStorage(storageKey),
    [storageKey],
  );
  const [periodStart, setPeriodStart] = useState<Date | undefined>(
    draft.periodStart,
  );
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(draft.periodEnd);
  const [goals, setGoals] = useState<NewGoal[]>(draft.goals);

  const addGoal = useCallback(() => {
    setGoals((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", content: "", weight: 0 },
    ]);
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((goal) => goal.id !== id);
    });
  }, []);

  const updateGoal = useCallback(
    (id: string, field: keyof Omit<NewGoal, "id">, value: string | number) => {
      setGoals((prev) =>
        prev.map((goal) =>
          goal.id === id ? { ...goal, [field]: value } : goal,
        ),
      );
    },
    [],
  );

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasContent: boolean =
      (periodStart && !Number.isNaN(periodStart.getTime())) ||
      (periodEnd && !Number.isNaN(periodEnd.getTime())) ||
      goals.some(
        (goal) =>
          goal.name.trim() ||
          goal.content.trim() ||
          (Number.isFinite(goal.weight) && goal.weight > 0),
      );

    if (!hasContent) {
      clearDraft();
      return;
    }

    const payload: NewGoalDraft = {
      periodStart,
      periodEnd,
      goals,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [clearDraft, goals, periodEnd, periodStart, storageKey]);

  return {
    periodStart,
    periodEnd,
    goals,
    setPeriodStart,
    setPeriodEnd,
    addGoal,
    removeGoal,
    updateGoal,
    clearDraft,
  };
};
