import { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../../../shared/src/types/db";
import { AppError } from "./errors";

export type LogLevel = Database["public"]["Enums"]["log_level"];
export type LogSource = Database["public"]["Enums"]["log_source"];

export interface LoggerOptions {
  accessLogId: number;
  supabase: SupabaseClient<Database>;
  defaultSource?: LogSource;
  defaultUserAgent?: string | null;
  defaultPageUrl?: string | null;
  defaultAppVersion?: string | null;
}

export interface LoggerErrorOptions {
  stackTrace?: string | null;
  source?: LogSource;
  userAgent?: string | null;
  pageUrl?: string | null;
  appVersion?: string | null;
  clientContext?: Json | null;
}

export interface Logger {
  info: (message: string) => Promise<void>;
  warn: (message: string) => Promise<void>;
  error: (message: string, options?: LoggerErrorOptions) => Promise<void>;
  critical: (message: string, options?: LoggerErrorOptions) => Promise<void>;
}

/**
 * ロガーを生成します。
 *
 * @param options ロガー作成時の設定
 * @returns ロガーインスタンス
 */
export const createLogger = (options: LoggerOptions): Logger => {
  const {
    accessLogId,
    supabase,
    defaultSource = "API",
    defaultUserAgent = null,
    defaultPageUrl = null,
    defaultAppVersion = null,
  } = options;

  const withDefaults = (
    overrides?: LoggerErrorOptions,
  ): LoggerErrorOptions => ({
    source: overrides?.source ?? defaultSource,
    userAgent: overrides?.userAgent ?? defaultUserAgent,
    pageUrl: overrides?.pageUrl ?? defaultPageUrl,
    appVersion: overrides?.appVersion ?? defaultAppVersion,
    stackTrace: overrides?.stackTrace ?? null,
    clientContext: overrides?.clientContext ?? null,
  });

  return {
    info: async (message: string): Promise<void> => {
      await insertInfoLog(supabase, accessLogId, "INFO", message);
    },
    warn: async (message: string): Promise<void> => {
      await insertInfoLog(supabase, accessLogId, "WARNING", message);
    },
    error: async (
      message: string,
      errorOptions?: LoggerErrorOptions,
    ): Promise<void> => {
      await insertErrorLog(
        supabase,
        accessLogId,
        "ERROR",
        message,
        withDefaults(errorOptions),
      );
    },
    critical: async (
      message: string,
      errorOptions?: LoggerErrorOptions,
    ): Promise<void> => {
      await insertErrorLog(
        supabase,
        accessLogId,
        "CRITICAL",
        message,
        withDefaults(errorOptions),
      );
    },
  };
};

/**
 * 情報ログを挿入します。
 */
async function insertInfoLog(
  supabase: SupabaseClient<Database>,
  accessLogId: number,
  level: LogLevel,
  message: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("info_logs")
    .insert({
      access_log_id: accessLogId,
      level,
      message,
    })
    .select("*")
    .single();

  if (error || !data) {
    const message = `Failed to record info log: ${error.message}`;
    throw new AppError(500, message, error);
  }
}

/**
 * エラーログを挿入します。
 */
async function insertErrorLog(
  supabase: SupabaseClient<Database>,
  accessLogId: number,
  level: Extract<LogLevel, "ERROR" | "CRITICAL">,
  message: string,
  options: LoggerErrorOptions,
): Promise<void> {
  const { error } = await supabase.from("error_logs").insert({
    access_log_id: accessLogId,
    level,
    message,
    stack_trace: options.stackTrace ?? null,
    source: options.source ?? "API",
    user_agent: options.userAgent ?? null,
    page_url: options.pageUrl ?? null,
    app_version: options.appVersion ?? null,
    client_context: options.clientContext ?? null,
  });
  if (error) {
    console.log(error);
  }
}
