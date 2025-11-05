import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "../../../../shared/src/types/db";
import {
  createUserSettings,
  getUserSettingsByUserId,
  updateUserSettings,
} from "./repository";

/**
 * ユーザー設定を作成します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param notifyEffortEmail 工数通知メールの有効可否
 * @returns 作成したユーザー設定
 */
export const createUserSettingsService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  notifyEffortEmail: boolean,
): Promise<Tables<"user_settings">> => {
  return await createUserSettings(supabase, userId, notifyEffortEmail);
};

/**
 * ユーザー設定を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns ユーザー設定
 */
export const fetchUserSettings = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<"user_settings"> | null> => {
  return await getUserSettingsByUserId(supabase, userId);
};

/**
 * ユーザー設定を更新します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param notifyEffortEmail 工数通知メールの有効可否
 * @returns 更新後のユーザー設定
 */
export const updateUserSettingsService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  notifyEffortEmail: boolean,
): Promise<Tables<"user_settings">> => {
  return await updateUserSettings(supabase, userId, notifyEffortEmail);
};
