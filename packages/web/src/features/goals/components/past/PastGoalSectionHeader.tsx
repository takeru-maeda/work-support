import { SectionHeader } from "@/components/sections/SectionHeader";
import { History } from "lucide-react";
import type { JSX } from "react";

const PastGoalSectionHeader = (): JSX.Element => {
  return (
    <SectionHeader
      icon={History}
      iconClassName="bg-chart-5/10 text-chart-5"
      title="過去の目標履歴"
      description="期間や進捗率で過去の目標を検索できます"
    />
  );
};

export default PastGoalSectionHeader;
