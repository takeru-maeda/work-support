import { PageLayout } from "@/components/layout/PageLayout";
import { GoalsTable } from "@/features/goals/components/GoalsTable";
import { PastGoalsTable } from "@/features/goals/components/PastGoalsTable";

export default function GoalsPage() {
  return (
    <PageLayout
      pageTitle="目標管理"
      pageDescription="目標進捗の管理や過去の目標の表示"
    >
      <div className="grid gap-4 sm:gap-6 w-full">
        <GoalsTable />
        <PastGoalsTable />
      </div>
    </PageLayout>
  );
}
