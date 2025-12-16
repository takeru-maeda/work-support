import { z } from "zod";

/**
 * 週報クエリのスキーマです。
 */
export const WeeklyReportQuerySchema = z.object({
  date: z.iso.date(),
});

/**
 * 週報レスポンスのスキーマです。
 */
export const WeeklyReportResponseSchema = z.object({
  weeklyReport: z.string(),
});

export type WeeklyReportQuery = z.infer<typeof WeeklyReportQuerySchema>;

export type WeeklyReportResponse = z.infer<typeof WeeklyReportResponseSchema>;
