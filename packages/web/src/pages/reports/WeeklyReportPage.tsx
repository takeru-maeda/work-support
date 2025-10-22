import { MissionEditor } from "@/features/reports/components/mission/MissionEditor";
import { WeeklyReport } from "@/features/reports/components/weekly-report";
import { PageLayout } from "@/components/layout/PageLayout";

export default function WeeklyReportPage() {
  return (
    <PageLayout
      pageTitle="週報出力"
      pageDescription="ミッションの更新と週報の出力"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <MissionEditor />
        </div>
        <div className="lg:col-span-2">
          <WeeklyReport />
        </div>
      </div>
    </PageLayout>
  );
}
