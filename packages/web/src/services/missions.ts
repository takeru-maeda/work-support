import useSWR, {
  mutate,
  type BareFetcher,
  type SWRConfiguration,
  type SWRResponse,
} from "swr";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import {
  GetMissionResponseSchema,
  UpdateMissionRequestSchema,
  UpdateMissionResponseSchema,
  type MissionGetResponse,
  type MissionUpdateResponse,
} from "@shared/schemas/missions";
import type { Mission } from "@/features/reports/types";
import { buildUserScopedKey } from "@/lib/utils";

/**
 * ミッション取得APIを実行します。
 *
 * @returns APIレスポンス
 */
const fetchMission = async (): Promise<MissionGetResponse> => {
  const response = await apiClient.get(API_ENDPOINTS.missions);
  return GetMissionResponseSchema.parse(response.data);
};

/**
 * ミッション情報を更新します。
 *
 * @param content 更新内容
 * @returns 更新後のミッション
 */
export const updateMission = async (content: string): Promise<Mission> => {
  const payload = UpdateMissionRequestSchema.parse({ content });
  const response = await apiClient.put(API_ENDPOINTS.missions, payload);
  const parsed: MissionUpdateResponse = UpdateMissionResponseSchema.parse(
    response.data,
  );

  await mutate<MissionGetResponse>(
    getMissionCacheKey(),
    { mission: parsed.mission },
    { revalidate: false },
  );

  return parsed.mission;
};

/**
 * ミッション情報を取得する SWR フックです。
 *
 * @param config SWR の設定
 * @returns SWR レスポンス
 */
export const useMission = (
  config?: SWRConfiguration<MissionGetResponse, Error>,
): SWRResponse<
  MissionGetResponse,
  Error,
  | SWRConfiguration<MissionGetResponse, Error, BareFetcher<MissionGetResponse>>
  | undefined
> => {
  const key: string = getMissionCacheKey();
  return useSWR<MissionGetResponse>(key, fetchMission, config);
};

/**
 * ミッションを管理するキャッシュのキーを取得します。
 *
 * @returns ミッションを管理するキャッシュのキー
 */
function getMissionCacheKey(): string {
  return buildUserScopedKey(API_ENDPOINTS.missions);
}
