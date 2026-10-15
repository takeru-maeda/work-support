import { AppError } from "../../lib/errors";

import type {
  EffortDraft,
  EffortDraftRecord,
  EffortEntry,
  SavedWorkRecord,
  WorkRecordInput,
} from "./types";
import type {
  TablesInsert,
  Database,
  Tables,
} from "../../../../shared/src/types/db";
import type { Json } from "../../../../shared/src/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

/** `save_work_records` が「見つからない」に使う SQLSTATE（マイグレーション 20261016000000 と合わせる） */
const NOT_FOUND_TARGETS: Readonly<Record<string, "project" | "task">> = {
  WS001: "project",
  WS002: "task",
};

/** `save_work_records` で、ID で指定した案件かタスクが（そのユーザーの・決めた案件の中に）見つからなかった */
export class WorkRecordTargetNotFoundError extends Error {
  constructor(readonly target: "project" | "task") {
    super(`${target} not found`);
    this.name = "WorkRecordTargetNotFoundError";
  }
}

/**
 * 1 回の送信の工数を、DB の関数 `save_work_records` で 1 つのトランザクションに保存します。
 * どの要素で失敗しても、行も、作った案件・タスクも残りません。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param workDate 作業日（YYYY-MM-DD）
 * @param entries 保存する要素（名前の空白の除去と時間の範囲の検査は済ませておく）
 * @returns 入力の順に、保存した行と、案件・タスクを新しく作ったか
 * @throws 指定した案件・タスクが見つからなければ WorkRecordTargetNotFoundError、それ以外の DB の誤りは AppError(500)
 */
export const saveWorkRecords = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  workDate: string,
  entries: WorkRecordInput[],
): Promise<SavedWorkRecord[]> => {
  const { data, error } = await supabase.rpc("save_work_records", {
    p_user_id: userId,
    p_work_date: workDate,
    p_entries: entries as unknown as Json,
  });

  if (error) {
    const target = NOT_FOUND_TARGETS[error.code];
    if (target) throw new WorkRecordTargetNotFoundError(target);
    const message = `Failed to save work records: ${error.message}`;
    throw new AppError(500, message, error);
  }

  // 関数は入力の 1 要素につき 1 行を入力の順に返す。service は位置で入力と組み合わせるので、件数が合わなければ止める
  const saved = data as unknown as SavedWorkRecord[];
  if (!Array.isArray(saved) || saved.length !== entries.length) {
    throw new AppError(
      500,
      `save_work_records returned ${Array.isArray(saved) ? saved.length : "non-array"} rows for ${entries.length} entries`,
    );
  }
  return saved;
};

/**
 * projects_with_tasks_mv を更新します。
 *
 * @param supabase Supabaseクライアント
 */
export const refreshProjectsWithTasksView = async (
  supabase: SupabaseClient<Database>,
): Promise<void> => {
  const { error } = await supabase.rpc("refresh_projects_with_tasks_mv");
  if (error) {
    const message = `Failed to refresh projects_with_tasks_mv: ${error.message}`;
    throw new AppError(500, message, error);
  }
};

/**
 * 工数ドラフトを取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns 工数ドラフト
 */
export const getWorkEntryDraftByUser = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<EffortDraftRecord | null> => {
  const { data, error } = await supabase
    .from("work_entry_drafts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const message = `Failed to fetch work entry draft: ${error.message}`;
    throw new AppError(500, message, error);
  }

  if (!data) return null;

  return parseDraftRow(data);
};

/**
 * 工数ドラフトを挿入します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param draft 工数ドラフト
 * @returns 保存したドラフト
 */
export const insertWorkEntryDraft = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  draft: EffortDraft,
): Promise<EffortDraftRecord> => {
  const payload: TablesInsert<"work_entry_drafts"> = {
    user_id: userId,
    entries: draftEntriesToJson(draft),
    memo: draft.memo ?? null,
    client_updated_at: draft.clientUpdatedAt,
  };

  const { data, error } = await supabase
    .from("work_entry_drafts")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    const message = `Failed to insert work entry draft: ${error?.message}`;
    throw new AppError(500, message, error);
  }

  return parseDraftRow(data);
};

/**
 * 工数ドラフトを更新します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param draft 工数ドラフト
 * @returns 更新したドラフト
 */
export const updateWorkEntryDraft = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  draft: EffortDraft,
): Promise<EffortDraftRecord> => {
  const payload: TablesInsert<"work_entry_drafts"> = {
    user_id: userId,
    entries: draftEntriesToJson(draft),
    memo: draft.memo ?? null,
    client_updated_at: draft.clientUpdatedAt,
  };

  const { data, error } = await supabase
    .from("work_entry_drafts")
    .update(payload)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    const message = `Failed to update work entry draft: ${error?.message}`;
    throw new AppError(500, message, error);
  }

  return parseDraftRow(data);
};

/**
 * 工数ドラフトを削除します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 */
export const deleteWorkEntryDraft = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> => {
  const { error } = await supabase
    .from("work_entry_drafts")
    .delete()
    .eq("user_id", userId);

  if (error) {
    const message = `Failed to delete work entry draft: ${error.message}`;
    throw new AppError(500, message, error);
  }
};

/**
 * ドラフトのエントリを JSON に変換します。
 */
const draftEntriesToJson = (draft: EffortDraft): Json => {
  return {
    date: draft.date ?? null,
    entries: draft.entries,
  } as unknown as Json;
};

/**
 * ドラフトの行をパースします。
 */
const parseDraftRow = (row: Tables<"work_entry_drafts">): EffortDraftRecord => {
  const payload = row.entries as {
    date: string | null;
    entries: EffortEntry[];
    memo?: string | null;
  };

  return {
    entries: payload.entries ?? [],
    memo: row.memo,
    date: payload.date ?? null,
    updated_at: row.updated_at,
    client_updated_at: row.client_updated_at,
    user_id: row.user_id,
  };
};
