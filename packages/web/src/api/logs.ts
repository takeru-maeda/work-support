import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import {
  ErrorLogCreateRequestSchema,
  ErrorLogCreateResponseSchema,
  type ErrorLogCreateResponse,
  type LogLevel,
} from "@shared/schemas/logs";

export interface ReportErrorOptions {
  message?: string;
  stackTrace?: string | null;
  level?: LogLevel;
  userAgent?: string | null;
  pageUrl?: string | null;
  appVersion?: string | null;
  clientContext?: Record<string, unknown> | null;
}

/**
 * UI のエラーをバックエンドへ記録します。
 *
 * @param error 発生したエラー
 * @param options 追加の送信オプション
 * @returns 作成されたエラーログ情報
 */
export const reportUiError = async (
  error: unknown,
  options: ReportErrorOptions = {},
): Promise<ErrorLogCreateResponse> => {
  const defaultMessage: string =
    options.message ??
    (error instanceof Error
      ? error.message
      : typeof error === "object"
        ? JSON.stringify(error)
        : error === undefined
          ? "Unknown error"
          : String(error));
  const defaultStack: string | null =
    options.stackTrace ??
    (error instanceof Error ? (error.stack ?? null) : null);
  const defaultUserAgent: string | null =
    options.userAgent ?? navigator?.userAgent ?? null;
  const defaultPageUrl: string | null =
    options.pageUrl ?? window?.location.href ?? null;
  const defaultAppVersion: string | null =
    options.appVersion ?? import.meta.env.VITE_APP_VERSION ?? null;
  const level: LogLevel = options.level ?? "ERROR";

  const payload = ErrorLogCreateRequestSchema.parse({
    message: defaultMessage,
    stackTrace: defaultStack,
    level,
    source: "UI",
    userAgent: defaultUserAgent,
    pageUrl: defaultPageUrl,
    appVersion: defaultAppVersion,
    clientContext: options.clientContext ?? undefined,
  });

  const response = await apiClient.post(API_ENDPOINTS.errorLogs, payload);
  return ErrorLogCreateResponseSchema.parse(response.data);
};
