import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import { buildUserScopedKey } from "@/lib/utils";
import {
  EffortDraftResponseSchema,
  EffortDraftSchema,
  EffortDraftUpsertResponseSchema,
  EffortEntriesRequestSchema,
  EffortEntriesResponseSchema,
  type EffortDraft,
  type EffortDraftResponse,
  type EffortDraftUpsertResponse,
  type EffortEntriesRequest,
  type EffortEntriesResponse,
} from "@shared/schemas/effort";

const EFFORT_DRAFT_CACHE_KEY = "effort-draft";

/**
 * 工数エントリを登録します。
 *
 * @param payload 送信する工数データ
 * @returns 保存結果
 */
export const submitEffortEntries = async (
  payload: EffortEntriesRequest,
): Promise<EffortEntriesResponse> => {
  const requestBody: EffortEntriesRequest =
    EffortEntriesRequestSchema.parse(payload);
  const response = await apiClient.post(
    API_ENDPOINTS.effortEntries,
    requestBody,
  );
  return EffortEntriesResponseSchema.parse(response.data);
};

/**
 * 工数ドラフトを取得します。
 *
 * @returns 保存済みのドラフト。存在しない場合はnull
 */
export const getEffortDraft = async (): Promise<
  EffortDraftResponse["draft"] | null
> => {
  const response = await apiClient.get(API_ENDPOINTS.effortDraft, {
    validateStatus: (status) => status === 200 || status === 204,
  });

  if (response.status === 204) return null;
  const parsed: EffortDraftResponse = EffortDraftResponseSchema.parse(
    response.data,
  );
  return parsed.draft;
};

/**
 * 工数ドラフトを保存します。
 *
 * @param payload 保存するドラフト
 * @returns サーバー側の適用結果
 */
export const saveEffortDraft = async (
  payload: EffortDraft,
): Promise<EffortDraftUpsertResponse> => {
  const requestBody: EffortDraft = EffortDraftSchema.parse(payload);
  const response = await apiClient.put(API_ENDPOINTS.effortDraft, requestBody);
  return EffortDraftUpsertResponseSchema.parse(response.data);
};

/**
 * 工数ドラフトを削除します。
 */
export const removeEffortDraft = async (): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.effortDraft);
};

/**
 * 工数ドラフトを SWR で取得します。
 *
 * @param config SWR の設定
 * @returns SWR レスポンス
 */
export const useEffortDraft = (
  config?: SWRConfiguration<EffortDraftResponse["draft"] | null, Error>,
): SWRResponse<EffortDraftResponse["draft"] | null, Error> => {
  return useSWR<EffortDraftResponse["draft"] | null, Error>(
    buildUserScopedKey(EFFORT_DRAFT_CACHE_KEY),
    getEffortDraft,
    config,
  );
};
