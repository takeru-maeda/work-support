import { format } from "date-fns";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import {
  WeeklyReportResponseSchema,
  type WeeklyReportResponse,
} from "@shared/schemas/reports";

/**
 * 週報を生成します。
 *
 * @param targetDate レポート対象日
 * @returns 週報レスポンス
 */
export const getWeeklyReport = async (
  targetDate: Date,
): Promise<WeeklyReportResponse> => {
  const formattedDate: string = format(targetDate, "yyyy-MM-dd");
  const response = await apiClient.get(API_ENDPOINTS.weeklyReport, {
    params: { date: formattedDate },
  });
  return WeeklyReportResponseSchema.parse(response.data);
};
