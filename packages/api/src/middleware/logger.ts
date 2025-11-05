import { createMiddleware } from "hono/factory";
import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../../../shared/src/types/db";
import { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../lib/supabase";
import { Context } from "hono";
import { HonoEnv } from "../custom-types";
import { AppError } from "../lib/errors";
import { createLogger } from "../lib/logger";

/**
 * アクセスログを記録します。
 *
 * @param c Honoコンテキスト
 * @param next 次のミドルウェア
 * @returns 記録後に実行される処理
 */
export const accessLogMiddleware = createMiddleware(async (c, next) => {
  c.set("start", Date.now());
  const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
  const insertLog: TablesInsert<"access_logs"> = {
    ip_address: c.req.header("cf-connecting-ip"),
    path: c.req.path,
  };
  const { data: accessLog, error } = await supabase
    .from("access_logs")
    .insert(insertLog)
    .select("*")
    .single();

  if (error || !accessLog) {
    throw new AppError(500, "Internal Server Error", error);
  }

  c.set("accessLog", accessLog);
  c.set(
    "logger",
    createLogger({
      accessLogId: accessLog.id,
      supabase,
      defaultSource: "API",
      defaultUserAgent: c.req.header("user-agent"),
      defaultPageUrl: c.req.url,
      defaultAppVersion: c.req.header("x-app-version") ?? null,
    }),
  );

  await next();

  c.executionCtx.waitUntil((async () => updateAccessLog(c))());
});

/**
 * アクセスログを更新します。
 *
 * @param c Honoコンテキスト
 * @returns 更新処理
 */
export async function updateAccessLog(c: Context<HonoEnv>) {
  const duration: number = Date.now() - c.get("start");

  const updateLog: TablesUpdate<"access_logs"> = {
    user_id: c.get("user")?.id,
    status_code: c.res.status,
    duration_ms: duration,
  };

  const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);
  const accessLog: Tables<"access_logs"> = c.get("accessLog");

  const { data, error } = await supabase
    .from("access_logs")
    .update(updateLog)
    .eq("id", accessLog.id)
    .select("*")
    .maybeSingle();

  const logger = c.get("logger");

  if (!data || error) {
    if (logger) {
      await logger.error("Failed to update access log", {
        stackTrace: error?.message ?? null,
      });
    } else {
      console.error("Failed to update access log:", error);
    }
  }
}
