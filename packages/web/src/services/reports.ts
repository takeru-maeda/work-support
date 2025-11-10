import { format } from "date-fns";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import {
  WeeklyReportResponseSchema,
  type WeeklyReportResponse,
} from "@shared/schemas/reports";
import {
  WorkRecordListQuerySchema,
  WorkRecordListResponseSchema,
  type WorkRecordListQuery,
  type WorkRecordListResponse,
} from "@shared/schemas/workRecords";

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
 * 工数一覧を取得します。
 *
 * @param query 検索条件
 * @returns 工数一覧レスポンス
 */
export const getWorkRecords = async (
  query: WorkRecordListQuery,
): Promise<WorkRecordListResponse> => {
  const validatedQuery: WorkRecordListQuery = WorkRecordListQuerySchema.parse(
    query,
  );
  const response = await apiClient.get(API_ENDPOINTS.workRecords, {
    params: validatedQuery,
  });
  return WorkRecordListResponseSchema.parse(response.data);
};
