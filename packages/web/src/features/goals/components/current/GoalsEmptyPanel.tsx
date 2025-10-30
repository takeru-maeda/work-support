import { SectionHeader } from "@/components/sections/SectionHeader";
import CardContainer from "@/components/shared/CardContainer";
import { Button } from "@/components/ui/button";
import { Plus, Target, TrendingUp } from "lucide-react";

interface GoalsEmptyPanelProps {
  onNavigateToAdd: () => void;
  className?: string;
}

const GoalsEmptyPanel = ({
  onNavigateToAdd,
  className,
}: GoalsEmptyPanelProps) => {
  return (
    <CardContainer className={className}>
      <SectionHeader
        icon={TrendingUp}
        iconClassName="bg-chart-2/10 text-chart-2"
        title="目標進捗"
        description="進行中の目標の追跡と更新"
        containerClassName="mb-4"
      />
      <div className="rounded-lg border border-border bg-muted/20 p-5 sm:p-12 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="p-2 sm:p-4 rounded-full bg-muted">
            <Target className="size-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-md sm:text-lg font-semibold text-foreground">
              目標が設定されていません
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              新しい目標を追加して、進捗を追跡しましょう。
            </p>
          </div>
          <Button onClick={onNavigateToAdd} className="gap-2 sm:mt-2">
            <Plus className="h-4 w-4" />
            目標を追加
          </Button>
        </div>
      </div>
    </CardContainer>
  );
};

export default GoalsEmptyPanel;
