import { format } from "date-fns";
import useSWRMutation, {
  type SWRMutationConfiguration,
  type SWRMutationResponse,
} from "swr/mutation";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import { buildUserScopedKey } from "@/lib/utils";
import {
  WeeklyReportResponseSchema,
  type WeeklyReportResponse,
} from "@shared/schemas/reports";

const WEEKLY_REPORT_CACHE_KEY = "weekly-report";

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

/**
 * 週報生成を SWR Mutation で実行します。
 *
 * @param config SWR Mutation の設定
 * @returns 週報生成用の Mutation
 */
export const useWeeklyReportMutation = (
  config?: SWRMutationConfiguration<WeeklyReportResponse, Error, string, Date>,
): SWRMutationResponse<WeeklyReportResponse, Error, string, Date> => {
  return useSWRMutation<WeeklyReportResponse, Error, string, Date>(
    buildUserScopedKey(WEEKLY_REPORT_CACHE_KEY),
    async (_key, { arg }: { arg: Date }) => {
      if (!arg) throw new Error("targetDate is required");
      return getWeeklyReport(arg);
    },
    config,
  );
};
