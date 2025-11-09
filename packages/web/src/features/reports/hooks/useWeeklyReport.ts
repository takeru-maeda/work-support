import { useCallback, useState } from "react";

import { getWeeklyReport } from "@/services/reports";
import {
  type WeeklyReportResponse,
} from "@shared/schemas/reports";

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(
    async (targetDate: Date): Promise<WeeklyReportResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const parsed: WeeklyReportResponse = await getWeeklyReport(targetDate);
        setReport(parsed.weeklyReport);

        return parsed;
      } catch (err) {
        setReport(null);
        const message: string =
          err instanceof Error ? err.message : String(err);
        setError(message);

        throw err instanceof Error ? err : new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    report,
    isLoading,
    error,
    generateReport,
  };
};
