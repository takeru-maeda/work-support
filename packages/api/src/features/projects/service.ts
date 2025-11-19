import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../../../shared/src/types/db";
import type { ProjectWithTasks } from "./types";
import { fetchProjectsWithTasks, ProjectsViewRow } from "./repository";

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
  const rows: ProjectsViewRow[] = await fetchProjectsWithTasks(
    supabase,
    userId,
  );

  const projectMap = new Map<number, ProjectWithTasks>();
  const taskSetMap = new Map<number, Set<number>>();

  for (const row of rows) {
    if (
      row.project_id === null ||
      row.project_name === null ||
      row.project_created_at === null
    ) {
      continue;
    }

    let project: ProjectWithTasks | undefined = projectMap.get(row.project_id);
    if (!project) {
      project = {
        id: row.project_id,
        name: row.project_name,
        created_at: row.project_created_at,
        tasks: [],
      };
      projectMap.set(row.project_id, project);
    }

    if (
      row.task_id !== null &&
      row.task_name !== null &&
      row.task_created_at !== null
    ) {
      const taskSet =
        taskSetMap.get(row.project_id) ?? new Set<number>();
      if (!taskSet.has(row.task_id)) {
        project.tasks.push({
          id: row.task_id,
          name: row.task_name,
          created_at: row.task_created_at,
        });
        taskSet.add(row.task_id);
        taskSetMap.set(row.project_id, taskSet);
      }
    }
  }

  return Array.from(projectMap.values());
};
