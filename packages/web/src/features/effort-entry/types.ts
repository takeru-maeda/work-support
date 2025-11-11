import type { ProjectWithTasks } from "@shared/schemas/projects";

export interface EffortEntry {
  id: string;
  projectId: number | null;
  projectName: string;
  taskId: number | null;
  taskName: string;
  estimatedHours: number | null;
  actualHours: number | null;
}

export interface EffortSelectionValue {
  id: number | null;
  name: string;
}

export interface EffortFormData {
  date: Date;
  entries: EffortEntry[];
  memo: string;
}

export interface ProjectBreakdownItem {
  projectId: number | null;
  projectName: string;
  estimated: number;
  actual: number;
  difference: number;
  hasEstimated: boolean;
}

export interface EffortEntryError {
  project?: string;
  task?: string;
  actualHours?: string;
}

export type EffortProjectOption = ProjectWithTasks;
