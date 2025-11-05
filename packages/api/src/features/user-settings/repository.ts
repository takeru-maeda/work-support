import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";

/**
 * ユーザー設定を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns ユーザー設定
 */
export const getUserSettingsByUserId = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<"user_settings"> | null> => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const message = `Failed to fetch user settings: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data;
};

/**
 * ユーザー設定を更新します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param notifyEffortEmail 工数通知メールの有効可否
 * @returns 更新後のユーザー設定
 */
export const updateUserSettings = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  notifyEffortEmail: boolean,
): Promise<Tables<"user_settings">> => {
  const payload: TablesUpdate<"user_settings"> = {
    notify_effort_email: notifyEffortEmail,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("user_settings")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    const message = `Failed to update user settings: ${error.message}`;
    throw new AppError(500, message, error);
  }

  if (!data) {
    throw new AppError(404, "User settings not found");
  }

  return data;
};

/**
 * ユーザー設定を作成します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param notifyEffortEmail 工数通知メールの有効可否
 * @returns 作成後のユーザー設定
 */
export const createUserSettings = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  notifyEffortEmail: boolean,
): Promise<Tables<"user_settings">> => {
  const payload: TablesInsert<"user_settings"> = {
    user_id: userId,
    notify_effort_email: notifyEffortEmail,
  };

  const { data, error } = await supabase
    .from("user_settings")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    const message = `Failed to create user settings: ${error?.message}`;
    throw new AppError(500, message, error ?? undefined);
  }

  return data;
};
