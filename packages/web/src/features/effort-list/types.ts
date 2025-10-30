export interface EffortListEntry {
  id: string;
  date: string;
  project: string;
  task: string;
  estimatedHours: number;
  actualHours: number;
}

export type EffortSortColumn =
  | "date"
  | "project"
  | "task"
  | "estimatedHours"
  | "actualHours"
  | "difference";

export type EffortSortDirection = "asc" | "desc" | null;
