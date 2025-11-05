import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "../../../../shared/src/types/db";
import { getMission, upsertMission } from "./repository";

/**
 * ミッションを取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns ミッション
 */
export const getMissionService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<"missions"> | null> => {
  return await getMission(supabase, userId);
};

/**
 * ミッションを登録または更新します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param content ミッション内容
 * @returns 保存後のミッション
 */
export const upsertMissionService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  content: string,
): Promise<Tables<"missions">> => {
  return await upsertMission(supabase, userId, content);
};
