import type { Json } from "../../../../shared/src/types/db";
import {
  TablesInsert,
  Database,
  Tables,
} from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";
import { SupabaseClient } from "@supabase/supabase-js";
import { ParsedEffort } from "./types";
import { Dayjs } from "dayjs";
import type {
  EffortDraft,
  EffortDraftRecord,
  EffortEntry,
  ProjectCreationResult,
  TaskCreationResult,
} from "./types";

/**
 * 案件を検索または作成します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param effort 工数入力データ
 * @returns 案件ID
 */
export async function findProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  effort: ParsedEffort,
): Promise<{ id: number; created: boolean }> {
  const { data: pj, error } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("name", effort.project_name)
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to fetch project: ${error.message}`, error);
  }

  if (!pj) {
    const { data: newPj, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: effort.project_name,
      })
      .select("id")
      .single();

    if (insertError) {
      const message = `Failed to create project: ${insertError.message}`;
      throw new AppError(500, message, insertError);
    }
    return { id: newPj.id, created: true };
  }

  return { id: pj.id, created: false };
}

/**
 * タスクを検索または作成します。
 *
 * @param supabase Supabaseクライアント
 * @param projectId 案件ID
 * @param taskName タスク名
 * @returns タスクID
 */
export async function findOrCreateTask(
  supabase: SupabaseClient<Database>,
  projectId: number,
  taskName: string,
): Promise<{ id: number; created: boolean }> {
  let { data: task, error } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId)
    .eq("name", taskName)
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to fetch task: ${error.message}`, error);
  }

  if (!task) {
    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        project_id: projectId,
        name: taskName,
      })
      .select("id")
      .single();

    if (insertError) {
      const message = `Failed to create task: ${insertError.message}`;
      throw new AppError(500, message, insertError);
    }
    return { id: newTask.id, created: true };
  }

  return { id: task.id, created: false };
}

/**
 * 工数記録を保存します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param taskId タスクID
 * @param workDate 作業日
 * @param effort 工数入力データ
 * @returns 保存した工数記録
 */
export async function insertWorkRecord(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskId: number,
  workDate: Date | Dayjs,
  effort: ParsedEffort,
): Promise<Tables<"work_records">> {
  const workRecord: TablesInsert<"work_records"> = {
    user_id: userId,
    task_id: taskId,
    work_date: workDate.toISOString(),
    hours: effort.hours || 0,
    estimated_hours: effort.estimated_hours,
  };

  const { data, error } = await supabase
    .from("work_records")
    .insert(workRecord)
    .select("*")
    .single();

  if (error || !data) {
    const message = `Failed to save work record: ${error?.message}`;
    throw new AppError(500, message, error);
  }

  return data;
}

/**
 * 案件をIDで取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param projectId 案件ID
 * @returns 案件
 */
export const getProjectById = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  projectId: number,
): Promise<Tables<"projects"> | null> => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    const message = `Failed to fetch project: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data;
};

/**
 * タスクをIDで取得します。
 *
 * @param supabase Supabaseクライアント
 * @param projectId 案件ID
 * @param taskId タスクID
 * @returns タスク
 */
export const getTaskById = async (
  supabase: SupabaseClient<Database>,
  projectId: number,
  taskId: number,
): Promise<Tables<"tasks"> | null> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    const message = `Failed to fetch task: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data;
};

/**
 * 案件を作成します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param name 案件名
 * @returns 作成した案件
 */
export const createProject = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
): Promise<ProjectCreationResult> => {
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message.includes("duplicate")) {
      const existing: Tables<"projects"> | null = await getProjectByName(
        supabase,
        userId,
        name,
      );
      if (existing) return { project: existing, created: false };
    }
    const message = `Failed to create project: ${error?.message}`;
    throw new AppError(500, message, error);
  }

  return { project: data, created: true };
};

/**
 * 案件を名称で取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param name 案件名
 * @returns 案件
 */
export const getProjectByName = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
): Promise<Tables<"projects"> | null> => {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("name", name)
    .maybeSingle();

  if (error) {
    const message = `Failed to fetch project: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data;
};

/**
 * タスクを作成します。
 *
 * @param supabase Supabaseクライアント
 * @param projectId 案件ID
 * @param name タスク名
 * @returns 作成したタスク
 */
export const createTask = async (
  supabase: SupabaseClient<Database>,
  projectId: number,
  name: string,
): Promise<TaskCreationResult> => {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: projectId, name })
    .select("*")
    .single();

  if (error || !data) {
    if (error?.message.includes("duplicate")) {
      const existing: Tables<"tasks"> | null = await getTaskByName(
        supabase,
        projectId,
        name,
      );
      if (existing) return { task: existing, created: false };
    }
    const message = `Failed to create task: ${error?.message}`;
    throw new AppError(500, message, error);
  }

  return { task: data, created: true };
};

/**
 * タスクを名称で取得します。
 *
 * @param supabase Supabaseクライアント
 * @param projectId 案件ID
 * @param name タスク名
 * @returns タスク
 */
export const getTaskByName = async (
  supabase: SupabaseClient<Database>,
  projectId: number,
  name: string,
): Promise<Tables<"tasks"> | null> => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("name", name)
    .maybeSingle();

  if (error) {
    const message = `Failed to fetch task: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data;
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
