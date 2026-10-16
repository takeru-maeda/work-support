import { z } from "zod";

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

/** `save_work_records` に渡す 1 要素。ID が無ければ名前で探し、無ければ作る */
export interface WorkRecordInput {
  project_id: number | null;
  project_name: string | null;
  task_id: number | null;
  task_name: string | null;
  estimated_hours: number | null;
  hours: number;
}

/** `save_work_records` が返す 1 行（時間は DB の列で小数第 2 位に丸めたあとの値） */
export interface SavedWorkRecord {
  entry_id: number;
  project_id: number;
  project_name: string;
  task_id: number;
  task_name: string;
  hours: number;
  estimated_hours: number | null;
  project_created: boolean;
  task_created: boolean;
}
