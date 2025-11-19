import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";

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
