import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../../shared/src/types/db";
import type { ProjectWithTasks } from "./types";
import { fetchProjectsWithTasks, ProjectRow } from "./repository";

/**
 * 案件とタスクを取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns 案件とタスクの配列
 */
export const getProjectsWithTasks = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProjectWithTasks[]> => {
  const rows: ProjectRow[] = await fetchProjectsWithTasks(supabase, userId);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    tasks: (row.tasks ?? []).map((task) => ({
      id: task.id,
      name: task.name,
      created_at: task.created_at,
    })),
  }));
};
