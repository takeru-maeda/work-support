import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import { isAxiosError } from "axios";
import useSWR, { mutate, type SWRConfiguration } from "swr";
import {
  UpdateUserSettingsRequestSchema,
  UserSettingsResponseSchema,
  type UpdateUserSettingsRequest,
  type UserSettings,
  type UserSettingsResponse,
} from "@shared/schemas/userSettings";
import { buildUserScopedKey } from "@/lib/utils";

/**
 * ユーザー設定を取得します。
 *
 * @returns ユーザー設定
 */
export const getUserSettings = async (): Promise<UserSettings | null> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.userSettings);
    const parsed: UserSettingsResponse = UserSettingsResponseSchema.parse(
      response.data,
    );
    return parsed.user_settings;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * ユーザー設定を初期化します。
 *
 * @returns 作成されたユーザー設定
 */
export const createUserSettings = async (): Promise<UserSettings> => {
  const response = await apiClient.post(API_ENDPOINTS.userSettings);
  const parsed: UserSettingsResponse = UserSettingsResponseSchema.parse(
    response.data,
  );
  const settings: UserSettings = parsed.user_settings;
  void mutate(getUserSettingsCacheKey());
  return settings;
};

/**
 * ユーザー設定を更新します。
 *
 * @param notifyEffortEmail 工数登録メール通知の有効フラグ
 * @returns 更新後のユーザー設定
 */
export const updateUserSettings = async (
  notifyEffortEmail: boolean,
): Promise<UserSettings> => {
  const payload: UpdateUserSettingsRequest =
    UpdateUserSettingsRequestSchema.parse({ notifyEffortEmail });
  const response = await apiClient.put(API_ENDPOINTS.userSettings, payload);
  const parsed: UserSettingsResponse = UserSettingsResponseSchema.parse(
    response.data,
  );
  const settings: UserSettings = parsed.user_settings;
  void mutate(getUserSettingsCacheKey());
  return settings;
};

/**
 * ユーザー設定を SWR で取得します。
 *
 * @param config SWR の設定
 * @returns SWR レスポンス（ユーザー設定）
 */
export const useUserSettings = (
  config?: SWRConfiguration<UserSettings | null, Error>,
) => {
  const key: string = getUserSettingsCacheKey();
  return useSWR<UserSettings | null, Error>(key, getUserSettings, config);
};

/**
 * ユーザー設定を管理するキャッシュのキーを取得します。
 *
 * @returns ユーザー設定を管理するキャッシュのキー
 */
function getUserSettingsCacheKey(): string {
  return buildUserScopedKey(API_ENDPOINTS.userSettings);
}
