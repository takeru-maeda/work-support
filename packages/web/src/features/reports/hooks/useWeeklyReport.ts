import { useCallback, useState } from "react";

import { useWeeklyReportMutation } from "@/services/reports";
import { type WeeklyReportResponse } from "@shared/schemas/reports";

interface UseWeeklyReportResult {
  report: string | null;
  isLoading: boolean;
  error: string | null;
  generateReport: (targetDate: Date) => Promise<WeeklyReportResponse>;
}

/**
 * 週報を取得します。
 *
 * @returns 週報生成ロジックの状態
 */
export const useWeeklyReport = (): UseWeeklyReportResult => {
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { trigger, isMutating } = useWeeklyReportMutation();

  const generateReport = useCallback(
    async (targetDate: Date): Promise<WeeklyReportResponse> => {
      setError(null);

      try {
        const parsed: WeeklyReportResponse = await trigger(targetDate, {
          throwOnError: true,
        });
        setReport(parsed.weeklyReport);

        return parsed;
      } catch (err) {
        setReport(null);
        const message: string =
          err instanceof Error ? err.message : String(err);
        setError(message);

        throw err instanceof Error ? err : new Error(message);
      }
    },
    [trigger],
  );

  return {
    report,
    isLoading: isMutating,
    error,
    generateReport,
  };
};
