import { z } from 'zod';
import { Tables } from '../../../../shared/src/types/db';

export const WeeklyReportQuerySchema = z.object({
  date: z.iso.date(),
});

export const WeeklyReportResponseSchema = z.object({
  mission: z.string().nullable(),
  weeklyReport: z.string(),
});

export type WeeklyReportQuery = z.infer<typeof WeeklyReportQuerySchema>;

export type WeeklyReportResponse = z.infer<typeof WeeklyReportResponseSchema>;

export interface Effort {
  work_date: string;
  hours: number;
  tasks: {
    name: string;
    projects: {
      name: string;
    };
  };
}

export interface GoalWithProgressDiff extends Tables<'goals'> {
  progressDiff: number;
}

export interface GoalSummary {
  simpleAverageProgress: number;
  simpleAverageProgressDiff: number;
  weightedAchievementRate: number;
  weightedAchievementRateDiff: number;
  expectedValue: number;
  differenceFromExpected: number;
}

export interface WeeklyReportData {
  startDate: Date;
  endDate: Date;
  mission: string | null;
  workRecords: Effort[];
  goals: GoalWithProgressDiff[];
  goalSummary: GoalSummary | null;
}
