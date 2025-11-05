import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";

export type ProjectRow = Pick<
  Tables<"projects">,
  "id" | "name" | "created_at"
> & {
  tasks: Array<Pick<Tables<"tasks">, "id" | "name" | "created_at">> | null;
};

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
): Promise<ProjectRow[]> => {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, created_at, tasks(id, name, created_at)")
    .eq("user_id", userId)
    .order("name", { ascending: true })
    .order("name", { ascending: true, referencedTable: "tasks" });

  if (error) {
    const message = `Failed to fetch projects: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data ?? [];
};
