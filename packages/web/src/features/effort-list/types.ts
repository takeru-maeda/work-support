export interface EffortListEntry {
  id: string;
  date: string;
  project: string;
  projectId: number;
  task: string;
  taskId: number;
  estimatedHours: number | null;
  actualHours: number;
  difference: number | null;
}

export type EffortSortColumn =
  | "date"
  | "project"
  | "task"
  | "estimatedHours"
  | "actualHours"
  | "difference";

export type EffortSortDirection = "asc" | "desc" | null;
