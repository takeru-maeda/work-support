import { z } from "zod";

export const WeeklyReportQuerySchema = z.object({
  date: z.iso.date(),
});

export const WeeklyReportResponseSchema = z.object({
  weeklyReport: z.string(),
});

export type WeeklyReportQuery = z.infer<typeof WeeklyReportQuerySchema>;

export type WeeklyReportResponse = z.infer<typeof WeeklyReportResponseSchema>;
