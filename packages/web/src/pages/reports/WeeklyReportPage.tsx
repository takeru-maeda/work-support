import { MissionEditor } from "@/features/reports/components/mission/MissionEditor";
import { WeeklyReport } from "@/features/reports/components/weekly-report";
import { PageLayout } from "@/components/layout/PageLayout";
import { useState } from "react";

export default function WeeklyReportPage() {
  const [saving, setSaving] = useState<boolean>(false);
  return (
    <PageLayout
      pageTitle="週報出力"
      pageDescription="ミッションの更新と週報の出力"
      loading={saving}
    >
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <MissionEditor saving={saving} setSaving={setSaving} />
        </div>
        <div className="lg:col-span-2">
          <WeeklyReport />
        </div>
      </div>
    </PageLayout>
  );
}
