export interface PastGoal {
  id: number;
  name: string;
  weight: number;
  progress: number;
  startDate: Date;
  endDate: Date;
  period: string;
  content: string | null;
}

export type SortField = "name" | "weight" | "period" | "progress";
export type SortDirection = "asc" | "desc" | null;

export interface Goal {
  id: number;
  name: string;
  weight: number;
  progress: number;
  content: string | null;
  startDate: Date;
  endDate: Date;
}

export type GoalSortField = "name" | "weight" | "progress" | null;

export interface NewGoal {
  id: string;
  name: string;
  content: string;
  weight: number;
}

export interface NewGoalDraft {
  periodStart?: Date;
  periodEnd?: Date;
  goals?: NewGoal[];
}
