import { SectionHeader } from "@/components/sections/SectionHeader";
import { TrendingUp } from "lucide-react";
import type { JSX } from "react";

const GoalSectionHeader = (): JSX.Element => {
  return (
    <SectionHeader
      icon={TrendingUp}
      iconClassName="bg-chart-2/10 text-chart-2"
      title="目標進捗"
      description="進行中の目標の追跡と更新"
    />
  );
};

export default GoalSectionHeader;
