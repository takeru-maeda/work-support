import { Target, Award, Plus, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { GoalProgressCard } from "@/features/goals/components/shared/GoalProgressCard";
import { GoalPeriodPicker } from "@/features/goals/components/shared/GoalPeriodPicker";

interface GoalsOverviewPanelProps {
  periodStart?: Date;
  periodEnd?: Date;
  onPeriodStartChange: (date?: Date) => void;
  onPeriodEndChange: (date?: Date) => void;
  onAddGoal: () => void;
  overallProgress: number;
  weightedProgressSum: number;
  overallProgressDiff: number;
  weightedProgressDiff: number;
}

export function GoalsOverviewPanel({
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  onAddGoal,
  overallProgress,
  weightedProgressSum,
  overallProgressDiff,
  weightedProgressDiff,
}: Readonly<GoalsOverviewPanelProps>) {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          icon={TrendingUp}
          iconClassName="bg-chart-2/10 text-chart-2"
          title="目標進捗"
          description="重み付けされた目標と達成状況を追跡"
        />

        <Button onClick={onAddGoal} size="sm" className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">追加</span>
          <span className="sm:hidden">追加</span>
        </Button>
      </div>

      <GoalPeriodPicker
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodStartChange={onPeriodStartChange}
        onPeriodEndChange={onPeriodEndChange}
      />

      <div className="grid gap-4 grid-cols-2">
        <GoalProgressCard
          icon={Target}
          iconClassName="bg-chart-1/10 text-chart-1"
          title="全体進捗"
          value={overallProgress}
          diff={overallProgressDiff}
        />
        <GoalProgressCard
          icon={Award}
          iconClassName="bg-chart-2/10 text-chart-2"
          title="加重進捗"
          value={weightedProgressSum}
          diff={weightedProgressDiff}
        />
      </div>
    </div>
  );
}
