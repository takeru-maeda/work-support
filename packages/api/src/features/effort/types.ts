import { z } from "zod";

import type { Tables } from "shared";

export type {
  EffortDraft,
  EffortDraftRecord,
  EffortDraftUpsertResponse,
  EffortEntriesRequest,
  EffortEntriesResponse,
  EffortEntry,
  EffortDraftResponse,
} from "../../../../shared/src/schemas/effort";
export {
  EffortDraftRecordSchema,
  EffortDraftSchema,
  EffortDraftUpsertResponseSchema,
  EffortEntriesRequestSchema,
  EffortEntriesResponseSchema,
  EffortEntrySchema,
  EffortDraftResponseSchema,
} from "../../../../shared/src/schemas/effort";

export const EffortRequestSchema = z.object({
  date: z.iso.date(),
  email: z.email(),
  effort: z.string(),
});

export const EffortResponseSchema = z.object({
  message: z.string(),
});

export type EffortRequest = z.infer<typeof EffortRequestSchema>;

export type EffortResponse = z.infer<typeof EffortResponseSchema>;

export interface ParsedEffort {
  project_name: string;
  taskName: string;
  estimated_hours: number | null;
  /** 実績。GAS の書式で空なら、読む段階で 0 にする */
  hours: number;
}

/** 工数のテキストの読めない行（行番号は 1 始まり） */
export interface EffortTextError {
  line: number;
  reason: string;
}

/** 工数のテキストを読んだ結果。errors が空でないときは、efforts を保存しない */
export interface ParsedEffortText {
  efforts: ParsedEffort[];
  errors: EffortTextError[];
}

export interface ProjectCreationResult {
  project: Tables<"projects">;
  created: boolean;
}

export interface TaskCreationResult {
  task: Tables<"tasks">;
  created: boolean;
}
