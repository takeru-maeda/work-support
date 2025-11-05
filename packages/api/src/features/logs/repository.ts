import { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Tables,
  TablesInsert,
} from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";

interface CreateErrorLogParams {
  accessLogId: number;
  message: string;
  stackTrace: string | null;
  level: Database["public"]["Enums"]["log_level"];
  source: Database["public"]["Enums"]["log_source"];
  userAgent: string | null;
  pageUrl: string | null;
  appVersion: string | null;
  clientContext?: TablesInsert<"error_logs">["client_context"];
}

/**
 * エラーログを記録します。
 *
 * @param supabase Supabaseクライアント
 * @param params 記録するエラー情報
 * @returns 保存したエラーログ
 */
export const createErrorLog = async (
  supabase: SupabaseClient<Database>,
  params: CreateErrorLogParams,
): Promise<Tables<"error_logs">> => {
  const insertPayload: TablesInsert<"error_logs"> = {
    access_log_id: params.accessLogId,
    message: params.message,
    stack_trace: params.stackTrace,
    level: params.level,
    source: params.source,
    user_agent: params.userAgent,
    page_url: params.pageUrl,
    app_version: params.appVersion,
    client_context: params.clientContext ?? null,
  };

  const { data, error } = await supabase
    .from("error_logs")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    const message = `Failed to record error log: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data;
};
