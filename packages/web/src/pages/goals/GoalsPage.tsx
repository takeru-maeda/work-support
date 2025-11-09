import { PageLayout } from "@/components/layout/PageLayout";
import { GoalsTable } from "@/features/goals/components/current";
import { PastGoalsTable } from "@/features/goals/components/past";

export default function GoalsPage() {
  return (
    <PageLayout
      pageTitle="目標管理"
      pageDescription="目標進捗の管理と過去の目標の表示"
    >
      <div className="grid gap-4 sm:gap-6 w-full mb-2 sm:mb-4">
        <GoalsTable />
        <PastGoalsTable />
      </div>
    </PageLayout>
  );
}
