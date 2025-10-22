import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";

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
  handleSave: () => void;
  handleCancel: () => void;
  totalWeight: number;
  isWeightValid: boolean;
  isWeightExceeded: boolean;
}

export function useAddGoalsManager(): UseAddGoalsManagerResult {
  const navigate = useNavigate();
  const [periodStart, setPeriodStart] = useState<Date | undefined>(new Date());
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(undefined);
  const [goals, setGoals] = useState<NewGoal[]>([
    { id: "1", name: "", content: "", weight: 0 },
  ]);

  const addGoal = useCallback(() => {
    setGoals((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", content: "", weight: 0 },
    ]);
  }, []);

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => {
      if (prev.length <= 1) return prev;
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

  const totalWeight: number = useMemo(
    () => goals.reduce((sum, goal) => sum + (goal.weight || 0), 0),
    [goals],
  );
  const isWeightValid: boolean = totalWeight === 100;
  const isWeightExceeded: boolean = totalWeight > 100;

  const handleSave = useCallback(() => {
    const validGoals = goals.filter(
      (goal) => goal.name.trim() && goal.weight > 0,
    );

    if (validGoals.length > 0 && periodStart && periodEnd) {
      console.log("Saving goals:", {
        periodStart,
        periodEnd,
        goals: validGoals,
      });
      navigate(ROUTES.goals);
    }
  }, [goals, navigate, periodEnd, periodStart]);

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
  };
}
