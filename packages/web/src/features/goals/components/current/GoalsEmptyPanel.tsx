import { EmptyState } from "@/components/empty-state/EmptyState";
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
      <EmptyState
        icon={<Target className="size-8 text-muted-foreground" />}
        title="目標が設定されていません"
        description="新しい目標を追加して、進捗を追跡しましょう。"
        actions={
          <Button onClick={onNavigateToAdd} className="gap-2 sm:mt-2">
            <Plus className="h-4 w-4" />
            目標を追加
          </Button>
        }
      />
    </CardContainer>
  );
};

export default GoalsEmptyPanel;
