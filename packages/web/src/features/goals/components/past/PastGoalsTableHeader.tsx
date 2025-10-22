import { History } from "lucide-react";

import { SectionHeader } from "@/components/sections/SectionHeader";

export function PastGoalsTableHeader() {
  return (
    <div className="p-4 sm:p-6">
      <SectionHeader
        icon={History}
        iconClassName="bg-muted"
        title="過去の目標"
        description="完了した目標の履歴"
      />
    </div>
  );
}
