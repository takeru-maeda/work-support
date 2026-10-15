import { AppError } from "../../lib/errors";

import type { Database, Tables } from "../../../../shared/src/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProjectsViewRow = Omit<Tables<"projects_with_tasks_mv">, "user_id">;

/**
 * 案件と紐づくタスクを取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns 案件とタスクの配列
 */
export const fetchProjectsWithTasks = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProjectsViewRow[]> => {
  const { data, error } = await supabase
    .from("projects_with_tasks_mv")
    .select(
      "project_id, project_name, project_created_at, task_id, task_name, task_created_at",
    )
    .eq("user_id", userId)
    .order("project_id", { ascending: false })
    .order("task_id", { ascending: false });

  if (error) {
    const message = `Failed to fetch projects: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data ?? [];
};

/** 元の表から読んだ案件と、その中のタスクの名前 */
export interface ProjectNamesRow {
  name: string;
  tasks: { name: string }[];
}

/**
 * 案件とタスクの名前を、元の表（projects、tasks）から読みます。
 * 作り直しに失敗したマテリアライズドビューに、新しい案件が出ないことがあるため。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns 作った順の案件と、作った順のタスク
 */
export const fetchProjectNames = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProjectNamesRow[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select("name, tasks(name)")
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .order("id", { referencedTable: "tasks", ascending: true });

  if (error) {
    const message = `Failed to fetch project names: ${error.message}`;
    throw new AppError(500, message, error);
  }
  return data ?? [];
};
