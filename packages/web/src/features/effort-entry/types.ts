export interface EffortEntry {
  id: string;
  project: string;
  task: string;
  estimatedHours: number;
  actualHours: number;
}

export interface EffortFormData {
  date: Date;
  entries: EffortEntry[];
  memo: string;
}

export interface ProjectBreakdownItem {
  project: string;
  estimated: number;
  actual: number;
  difference: number;
}
