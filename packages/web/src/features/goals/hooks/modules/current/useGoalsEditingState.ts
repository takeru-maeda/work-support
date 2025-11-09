import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  Goal,
  GoalSortField,
  SortDirection,
} from "@/features/goals/types";

interface GoalsEditingStateResult {
  goals: Goal[];
  sortedGoals: Goal[];
  totalWeight: number;
  sortField: GoalSortField;
  sortDirection: SortDirection;
  handleSort: (field: GoalSortField) => void;
  updateGoalName: (id: number, name: string) => void;
  updateGoalWeight: (id: number, weight: number) => void;
  updateGoalProgress: (id: number, progress: number) => void;
  changedGoals: Goal[];
  hasChanges: boolean;
  isWeightBalanced: boolean;
  replaceGoal: (goal: Goal) => void;
}

export const useGoalsEditingState = (
  sourceGoals: Goal[],
): GoalsEditingStateResult => {
  const [goals, setGoals] = useState<Goal[]>(sourceGoals);
  const [originalGoals, setOriginalGoals] = useState<Map<number, Goal>>(
    new Map(sourceGoals.map((goal) => [goal.id, { ...goal }])),
  );
  const [sortField, setSortField] = useState<GoalSortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    setGoals(sourceGoals);
    setOriginalGoals(
      new Map(sourceGoals.map((goal) => [goal.id, { ...goal }])),
    );
  }, [sourceGoals]);

  const handleSort = useCallback(
    (field: GoalSortField) => {
      if (sortField === field) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortField(null);
          setSortDirection(null);
        }
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    },
    [sortDirection, sortField],
  );

  const updateGoalName = useCallback((id: number, name: string) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, name } : goal)),
    );
  }, []);

  const updateGoalWeight = useCallback((id: number, weight: number) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id ? { ...goal, weight: Math.max(0, weight) } : goal,
      ),
    );
  }, []);

  const updateGoalProgress = useCallback((id: number, progress: number) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id
          ? { ...goal, progress: Math.min(100, Math.max(0, progress)) }
          : goal,
      ),
    );
  }, []);

  const sortedGoals = useMemo(() => {
    if (!sortField || !sortDirection) return goals;
    return [...goals].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "weight") {
        comparison = a.weight - b.weight;
      } else if (sortField === "progress") {
        comparison = a.progress - b.progress;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [goals, sortDirection, sortField]);

  const totalWeight: number = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.weight, 0),
    [goals],
  );

  const changedGoals = useMemo(() => {
    return goals.filter((goal) => {
      const original = originalGoals.get(goal.id);
      if (!original) return true;
      return (
        original.name !== goal.name ||
        original.weight !== goal.weight ||
        original.progress !== goal.progress
      );
    });
  }, [goals, originalGoals]);

  const replaceGoal = useCallback((updated: Goal) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === updated.id ? updated : goal)),
    );
    setOriginalGoals((prev) => {
      const clone = new Map(prev);
      clone.set(updated.id, { ...updated });
      return clone;
    });
  }, []);

  return {
    goals,
    sortedGoals,
    totalWeight,
    sortField,
    sortDirection,
    handleSort,
    updateGoalName,
    updateGoalWeight,
    updateGoalProgress,
    changedGoals,
    hasChanges: changedGoals.length > 0,
    isWeightBalanced: totalWeight === 100,
    replaceGoal,
  };
};
