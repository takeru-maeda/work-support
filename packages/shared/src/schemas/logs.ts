import { z } from "zod";

/**
 * ログレベルのスキーマです。
 */
const LogLevelSchema = z.enum(["WARNING", "ERROR", "CRITICAL"]);

/**
 * ログソースのスキーマです。
 */
const LogSourceSchema = z.enum(["API", "UI"]);

/**
 * エラーログ作成リクエストのスキーマです。
 *
 * POST /api/logs
 */
export const ErrorLogCreateRequestSchema = z.object({
  message: z.string().min(1),
  stackTrace: z.string().nullable().optional(),
  level: LogLevelSchema,
  source: LogSourceSchema,
  userAgent: z.string().nullable().optional(),
  pageUrl: z.string().nullable().optional(),
  appVersion: z.string().nullable().optional(),
  clientContext: z.record(z.string(), z.unknown()).nullish(),
});

/**
 * エラーログ作成レスポンスのスキーマです。
 *
 * POST /api/logs
 */
export const ErrorLogCreateResponseSchema = z.object({
  id: z.number(),
  recordedAt: z.iso.datetime({ offset: true }),
});

export type ErrorLogCreateRequest = z.infer<typeof ErrorLogCreateRequestSchema>;

export type ErrorLogCreateResponse = z.infer<
  typeof ErrorLogCreateResponseSchema
>;

export type LogLevel = z.infer<typeof LogLevelSchema>;

export type LogSource = z.infer<typeof LogSourceSchema>;
