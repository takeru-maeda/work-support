import { createErrorLogService } from "../features/logs/service";
import { updateAccessLog } from "../middleware/logger";

import { AppError } from "./errors";
import { createSupabaseClient } from "./supabase";

import type { Database, Tables } from "../../../shared/src/types/db";
import type { HonoEnv } from "../custom-types";
import type { LoggerErrorOptions } from "./logger";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * アプリ全体のエラーを処理します。
 *
 * @param err 発生したエラー
 * @param c Honoコンテキスト
 * @returns エラーレスポンス
 */
export const globalErrorHandler = async (err: Error, c: Context<HonoEnv>) => {
  const accessLog: Tables<"access_logs"> = c.get("accessLog");
  const supabase: SupabaseClient<Database> = createSupabaseClient(c.env);

  let statusCode: ContentfulStatusCode = 500;
  let message: string = "Internal Server Error";
  let dbMessage: string = message;
  let logLevel: "ERROR" | "CRITICAL" = "ERROR";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    logLevel = err.logLevel;
    dbMessage = err.internalError ? err.internalError.message : message;
  }

  const logger = c.get("logger");
  const errorOptions: LoggerErrorOptions = {
    stackTrace: err.stack ?? null,
    source: c.req.path === "/api/logs/error" ? "UI" : "API",
    userAgent: c.req.header("user-agent") ?? null,
    pageUrl: c.req.url,
    appVersion: c.req.header("x-app-version") ?? null,
    clientContext: null,
  };

  const handleErrorOnBackground: Promise<void> = (async () => {
    if (logger) {
      if (logLevel === "CRITICAL") {
        await logger.critical(dbMessage, errorOptions);
      } else {
        await logger.error(dbMessage, errorOptions);
      }
    } else {
      await createErrorLogService(supabase, accessLog.id, {
        message: dbMessage,
        stackTrace: errorOptions.stackTrace,
        level: logLevel,
        source: errorOptions.source ?? "API",
        userAgent: errorOptions.userAgent,
        pageUrl: errorOptions.pageUrl,
        appVersion: errorOptions.appVersion,
        clientContext: errorOptions.clientContext as
          | Record<string, unknown>
          | undefined,
      });
    }
    await updateAccessLog(c);
  })();

  c.executionCtx.waitUntil(handleErrorOnBackground);

  return c.json(
    {
      error: message,
      accessLogId: accessLog.id,
    },
    statusCode,
  );
};
