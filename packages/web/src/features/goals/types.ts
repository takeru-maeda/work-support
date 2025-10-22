export interface PastGoal {
  id: string;
  name: string;
  weight: number;
  progress: number;
  period: string;
  content?: string;
}

export type SortField = "name" | "weight" | "period" | "progress";
export type SortDirection = "asc" | "desc" | null;

export interface Goal {
  id: string;
  name: string;
  weight: number;
  progress: number;
  content?: string;
}

export interface HistoricalData {
  date: string;
  [key: string]: number | string;
}

export type GoalSortField = "name" | "weight" | "progress" | null;

export interface NewGoal {
  id: string;
  name: string;
  content: string;
  weight: number;
}
