import { format } from "date-fns";
import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";
import useSWRMutation, {
  type SWRMutationConfiguration,
  type SWRMutationResponse,
} from "swr/mutation";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import { buildUserScopedKey } from "@/lib/utils";
import { useUserStore } from "@/store/user";
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
 * 工数一覧を取得します。
 *
 * @param query 検索条件
 * @returns 工数一覧レスポンス
 */
export const getWorkRecords = async (
  query: WorkRecordListQuery,
): Promise<WorkRecordListResponse> => {
  const validatedQuery: WorkRecordListQuery =
    WorkRecordListQuerySchema.parse(query);
  const response = await apiClient.get(API_ENDPOINTS.workRecords, {
    params: validatedQuery,
  });
  return WorkRecordListResponseSchema.parse(response.data);
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

/**
 * 工数一覧を SWR で取得します。
 *
 * @param query 検索条件
 * @param config SWR の設定
 * @returns SWR レスポンス
 */
export const useWorkRecords = (
  query: WorkRecordListQuery | null,
  config?: SWRConfiguration<WorkRecordListResponse | undefined, Error>,
): SWRResponse<WorkRecordListResponse | undefined, Error> => {
  const userId: string | undefined = useUserStore.getState().user?.id;
  if (!userId) throw new Error("User not authenticated");
  const baseKey: string = `work-records_${userId}`;
  const key: string = query ? `${baseKey}_${JSON.stringify(query)}` : baseKey;

  return useSWR<WorkRecordListResponse | undefined, Error>(
    key,
    () => (query ? getWorkRecords(query) : Promise.resolve(undefined)),
    {
      keepPreviousData: true,
      ...config,
    },
  );
};
