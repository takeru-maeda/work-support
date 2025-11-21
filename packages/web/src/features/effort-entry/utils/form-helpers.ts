import type {
  EffortEntry,
  EffortEntryError,
  EffortFormData,
} from "@/features/effort-entry/types";
import type { EffortEntry as EffortEntryDto } from "@shared/schemas/effort";

/**
 * フォーム用の空エントリを生成します。
 *
 * @returns 新規エントリ
 */
export const createEmptyEntry = (): EffortEntry => {
  const entryId = createEntryId();
  return {
    id: entryId,
    projectGroupId: entryId,
    projectId: null,
    projectName: "",
    taskId: null,
    taskName: "",
    estimatedHours: null,
    actualHours: null,
  };
};

/**
 * 初期フォームデータを生成します。
 *
 * @returns 初期フォーム状態
 */
export const createInitialFormData = (): EffortFormData => ({
  date: new Date(),
  entries: [createEmptyEntry()],
  memo: "",
});

/**
 * 日付をローカルタイムゾーンの yyyy-MM-dd 形式に整形します。
 *
 * @param date 対象日付
 * @returns ローカル基準の文字列
 */
export const formatDateOnly = (date: Date): string => {
  const localDate = new Date(date);
  localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
  return localDate.toISOString().split("T")[0];
};

/**
 * フォームエントリを API リクエスト形式へ変換します。
 *
 * @param entry 変換対象
 * @returns API 用エントリ
 */
export const mapFormEntryToRequest = (entry: EffortEntry): EffortEntryDto => ({
  project_id: entry.projectId,
  project_name:
    entry.projectId || entry.projectName.trim().length === 0
      ? null
      : entry.projectName.trim(),
  task_id: entry.taskId,
  task_name:
    entry.taskId || entry.taskName.trim().length === 0
      ? null
      : entry.taskName.trim(),
  estimated_hours: entry.estimatedHours ?? null,
  hours: entry.actualHours ?? 0,
});

/**
 * API のドラフトエントリをフォーム用に変換します。
 *
 * @param entry API ドラフトエントリ
 * @returns フォーム用エントリ
 */
export const mapDraftEntryToFormEntry = (
  entry: EffortEntryDto,
): EffortEntry => ({
  id: createEntryId(),
  projectGroupId: deriveProjectGroupId(entry),
  projectId: entry.project_id,
  projectName: entry.project_name ?? "",
  taskId: entry.task_id,
  taskName: entry.task_name ?? "",
  estimatedHours: entry.estimated_hours ?? null,
  actualHours: entry.hours ?? 0,
});

/**
 * エントリのバリデーション結果を返します。
 *
 * @param entry 検証対象エントリ
 * @returns エラー情報。問題がなければ null
 */
export const validateEffortEntry = (
  entry: EffortEntry,
): EffortEntryError | null => {
  const errors: EffortEntryError = {};
  if (!entry.projectId && entry.projectName.trim().length === 0) {
    errors.project = "必須入力";
  }
  if (!entry.taskId && entry.taskName.trim().length === 0) {
    errors.task = "必須入力";
  }
  if (entry.actualHours === null) {
    errors.actualHours = "必須入力";
  }
  return Object.keys(errors).length > 0 ? errors : null;
};

/**
 * エントリ ID を生成します。
 *
 * @returns ランダム ID
 */
const createEntryId = (): string => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const deriveProjectGroupId = (entry: EffortEntryDto): string => {
  if (entry.project_id !== null) {
    return `project:${entry.project_id}`;
  }
  if (entry.project_name && entry.project_name.trim().length > 0) {
    return `name:${entry.project_name.trim().toLowerCase()}`;
  }
  return createEntryId();
};

export const ensureProjectGroupId = (entry: EffortEntry): EffortEntry => {
  if (entry.projectGroupId) {
    return entry;
  }
  if (entry.projectId !== null) {
    return { ...entry, projectGroupId: `project:${entry.projectId}` };
  }
  if (entry.projectName.trim().length > 0) {
    return {
      ...entry,
      projectGroupId: `name:${entry.projectName.trim().toLowerCase()}`,
    };
  }
  return { ...entry, projectGroupId: entry.id };
};
