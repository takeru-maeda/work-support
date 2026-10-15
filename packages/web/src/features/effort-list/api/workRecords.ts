import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import { useUserStore } from "@/store/user";
import {
  WorkRecordListQuerySchema,
  WorkRecordListResponseSchema,
  type WorkRecordListQuery,
  type WorkRecordListResponse,
} from "@shared/schemas/workRecords";

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
