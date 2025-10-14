import { Tables } from "shared";

export {
  WeeklyReportQuery,
  WeeklyReportQuerySchema,
  WeeklyReportResponse,
  WeeklyReportResponseSchema,
} from "../../../../shared/src/schemas/reports";

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

export interface GoalWithProgressDiff extends Tables<"goals"> {
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
