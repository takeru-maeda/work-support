import { Tables } from "shared";

export {
  WeeklyReportQuery,
  WeeklyReportQuerySchema,
  WeeklyReportResponse,
  WeeklyReportResponseSchema,
} from "../../../../shared/src/schemas/reports";
export {
  WorkRecordListQuerySchema,
  WorkRecordListResponseSchema,
} from "../../../../shared/src/schemas/workRecords";
export type {
  WorkRecordListQuery,
  WorkRecordListResponse,
  WorkRecordSort,
} from "../../../../shared/src/schemas/workRecords";

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

export type WorkRecordWithRelations = Tables<"work_record_diffs"> & {
  id: number;
  work_date: string;
  hours: number;
  hours_diff: number;
  project_name: string;
  task_name: string;
};
