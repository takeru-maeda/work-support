import { Target, Award, Plus, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { GoalProgressCard } from "@/features/goals/components/shared/GoalProgressCard";

interface GoalsOverviewPanelProps {
  periodStart?: Date;
  periodEnd?: Date;
  onAddGoal: () => void;
  overallProgress: number;
  weightedProgressSum: number;
  overallProgressDiff: number;
  weightedProgressDiff: number;
}

export function GoalsOverviewPanel({
  periodStart,
  periodEnd,
  onAddGoal,
  overallProgress,
  weightedProgressSum,
  overallProgressDiff,
  weightedProgressDiff,
}: Readonly<GoalsOverviewPanelProps>) {
  return (
    <div className="space-y-4 ">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader
          icon={TrendingUp}
          iconClassName="bg-chart-2/10 text-chart-2"
          title="目標進捗"
          description="進行中の目標の追跡と更新"
        />

        <Button onClick={onAddGoal} size="sm" className="shrink-0 gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">追加</span>
          <span className="sm:hidden">追加</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">期間:</span>
        <span>
          {periodStart?.toLocaleDateString()} -{" "}
          {periodEnd?.toLocaleDateString()}
        </span>
      </div>

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
