import { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json, Tables } from "../../../../shared/src/types/db";
import { ErrorLogCreateRequest } from "./types";
import { createErrorLog } from "./repository";

/**
 * エラーログを保存します。
 *
 * @param supabase Supabaseクライアント
 * @param accessLogId アクセスログID
 * @param payload エラー情報
 * @returns 保存したエラーログ
 */
export const createErrorLogService = async (
  supabase: SupabaseClient<Database>,
  accessLogId: number,
  payload: ErrorLogCreateRequest,
): Promise<Tables<"error_logs">> => {
  return await createErrorLog(supabase, {
    accessLogId,
    message: payload.message,
    stackTrace: payload.stackTrace ?? null,
    level: payload.level,
    source: payload.source,
    userAgent: payload.userAgent ?? null,
    pageUrl: payload.pageUrl ?? null,
    appVersion: payload.appVersion ?? null,
    clientContext: (payload.clientContext as Json | null | undefined) ?? null,
  });
};
