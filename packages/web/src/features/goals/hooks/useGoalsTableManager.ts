import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ROUTES } from "@/config/routes";
import type {
  Goal,
  GoalSortField,
  HistoricalData,
  SortDirection,
} from "@/features/goals/types";

const INITIAL_PERIOD = {
  start: new Date("2025-04-01"),
  end: new Date("2025-10-01"),
};

const INITIAL_GOALS: Goal[] = [
  {
    id: "1",
    name: "Launch new product feature",
    weight: 35,
    progress: 75,
    content:
      "新しい製品機能をリリースし、ユーザーエクスペリエンスを向上させる。主要な機能には、リアルタイム通知、高度な検索機能、カスタマイズ可能なダッシュボードが含まれます。",
  },
  {
    id: "2",
    name: "Improve team collaboration",
    weight: 25,
    progress: 60,
    content:
      "チーム間のコミュニケーションとコラボレーションを強化するため、定期的なミーティングの実施、共有ドキュメントの整備、コラボレーションツールの導入を行います。",
  },
  {
    id: "3",
    name: "Reduce technical debt",
    weight: 20,
    progress: 40,
    content:
      "既存のコードベースをリファクタリングし、技術的負債を削減します。レガシーコードの更新、テストカバレッジの向上、ドキュメントの改善を含みます。",
  },
  {
    id: "4",
    name: "Enhance documentation",
    weight: 20,
    progress: 85,
    content:
      "プロジェクトのドキュメントを包括的に更新し、新しいメンバーのオンボーディングを容易にします。API仕様書、アーキテクチャ図、ベストプラクティスガイドを含みます。",
  },
];

const HISTORICAL_DATA: HistoricalData[] = [
  { date: "2025/04/01", "1": 20, "2": 15, "3": 10, "4": 30 },
  { date: "2025/05/01", "1": 35, "2": 25, "3": 15, "4": 45 },
  { date: "2025/06/01", "1": 50, "2": 40, "3": 25, "4": 60 },
  { date: "2025/07/01", "1": 60, "2": 50, "3": 30, "4": 70 },
  { date: "2025/08/01", "1": 70, "2": 55, "3": 35, "4": 80 },
  { date: "2025/09/01", "1": 75, "2": 60, "3": 40, "4": 85 },
];

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
  removeGoal: (id: string) => void;
  updateGoalName: (id: string, name: string) => void;
  updateGoalWeight: (id: string, weight: number) => void;
  updateGoalProgress: (id: string, progress: number) => void;
  isWeightBalanced: boolean;
  openContentDialog: (goal: Goal) => void;
  handleContentDialogOpenChange: (open: boolean) => void;
  isContentDialogOpen: boolean;
  selectedGoal: Goal | null;
  editedContent: string;
  setEditedContent: (value: string) => void;
  updateGoalContent: () => void;
  onNavigateToAdd: () => void;
}

export function useGoalsTableManager(): UseGoalsTableManagerResult {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<{ start?: Date; end?: Date }>(
    INITIAL_PERIOD,
  );
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [sortField, setSortField] = useState<GoalSortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isContentDialogOpen, setIsContentDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState("");

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
  }, [goals, sortField, sortDirection]);

  const totalWeight = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.weight, 0),
    [goals],
  );

  const weightedProgressSum = useMemo(
    () =>
      goals.reduce((sum, goal) => sum + (goal.progress * goal.weight) / 100, 0),
    [goals],
  );

  const overallProgress = useMemo(() => {
    return totalWeight > 0 ? (weightedProgressSum / totalWeight) * 100 : 0;
  }, [totalWeight, weightedProgressSum]);

  const previousWeekData = useMemo(() => {
    if (HISTORICAL_DATA.length === 0) {
      return { overall: 0, weighted: 0 };
    }

    const lastEntry = HISTORICAL_DATA[HISTORICAL_DATA.length - 1];

    let totalProgress = 0;
    let count = 0;
    goals.forEach((goal) => {
      const value = lastEntry[goal.id];
      if (typeof value === "number") {
        totalProgress += value;
        count += 1;
      }
    });

    const overall = count > 0 ? totalProgress / count : 0;

    let weighted = 0;
    goals.forEach((goal) => {
      const value = lastEntry[goal.id];
      if (typeof value === "number") {
        weighted += (value * goal.weight) / 100;
      }
    });

    return { overall, weighted };
  }, [goals]);

  const overallProgressDiff = overallProgress - previousWeekData.overall;
  const weightedProgressDiff = weightedProgressSum - previousWeekData.weighted;

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
    [sortField, sortDirection],
  );

  const removeGoal = useCallback((id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }, []);

  const updateGoalName = useCallback((id: string, name: string) => {
    setGoals((prev) =>
      prev.map((goal) => (goal.id === id ? { ...goal, name } : goal)),
    );
  }, []);

  const updateGoalWeight = useCallback((id: string, weight: number) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id ? { ...goal, weight: Math.max(0, weight) } : goal,
      ),
    );
  }, []);

  const updateGoalProgress = useCallback((id: string, progress: number) => {
    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === id
          ? { ...goal, progress: Math.min(100, Math.max(0, progress)) }
          : goal,
      ),
    );
  }, []);

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

  const updateGoalContent = useCallback(() => {
    if (!selectedGoal) return;

    setGoals((prev) =>
      prev.map((goal) =>
        goal.id === selectedGoal.id
          ? { ...goal, content: editedContent }
          : goal,
      ),
    );
    setIsContentDialogOpen(false);
    setSelectedGoal(null);
  }, [editedContent, selectedGoal]);

  const onNavigateToAdd = useCallback(() => {
    navigate(ROUTES.goalsAdd);
  }, [navigate]);

  return {
    period,
    goals,
    sortedGoals,
    totalWeight,
    weightedProgressSum,
    overallProgress,
    overallProgressDiff,
    weightedProgressDiff,
    sortField,
    sortDirection,
    handleSort,
    removeGoal,
    updateGoalName,
    updateGoalWeight,
    updateGoalProgress,
    isWeightBalanced: totalWeight === 100,
    openContentDialog,
    handleContentDialogOpenChange,
    isContentDialogOpen,
    selectedGoal,
    editedContent,
    setEditedContent,
    updateGoalContent,
    onNavigateToAdd,
  };
}
