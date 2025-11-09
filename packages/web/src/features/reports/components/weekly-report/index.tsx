import { useCallback, useState } from "react";
import { endOfWeek, startOfWeek } from "date-fns";

import { WeeklyReportControls } from "@/features/reports/components/weekly-report/WeeklyReportControls";
import { WeeklyReportPreview } from "@/features/reports/components/weekly-report/WeeklyReportPreview";
import { SectionHeader } from "@/components/sections/SectionHeader";
import { FileText } from "lucide-react";
import CardContainer from "@/components/shared/CardContainer";
import { useWeeklyReport } from "@/features/reports/hooks/useWeeklyReport";
import { reportUiError } from "@/services/logs";

export function WeeklyReport() {
  const [date, setDate] = useState<Date>(new Date());
  const [copied, setCopied] = useState(false);
  const { report, isLoading, error, generateReport } = useWeeklyReport();

  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });

  const handleCopy = useCallback(async () => {
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      reportUiError(err);
    }
  }, [report]);

  const handleOutput = useCallback(async () => {
    try {
      await generateReport(date);
      setCopied(false);
    } catch (err) {
      reportUiError(err);
    }
  }, [date, generateReport]);

  return (
    <CardContainer className="space-y-4">
      <SectionHeader
        icon={FileText}
        iconClassName="bg-chart-3/10 text-chart-3"
        title="週報出力"
        description="週報の雛形を出力します"
      />
      <WeeklyReportControls
        date={date}
        weekStart={weekStart}
        weekEnd={weekEnd}
        loading={isLoading}
        onDateChange={(next) => setDate(next)}
        onOutput={handleOutput}
      />

      {report && (
        <WeeklyReportPreview
          reportText={report}
          copied={copied}
          onCopy={handleCopy}
        />
      )}

      {error && (
        <p className="text-sm text-destructive">
          週報の取得に失敗しました: {error}
        </p>
      )}
    </CardContainer>
  );
}
