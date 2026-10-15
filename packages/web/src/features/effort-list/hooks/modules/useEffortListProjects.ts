import { useEffect, useMemo } from "react";

import { reportUiError } from "@/api/logs";
import { useProjectsWithTasks } from "@/api/projects";
import { showErrorToast } from "@/lib/toast";
import type { ProjectWithTasks } from "@shared/schemas/projects";

export interface EffortListProjectsResult {
  projectOptions: ProjectWithTasks[];
  taskOptions: { id: number; name: string }[];
  isLoading: boolean;
  mutateProjects: ReturnType<typeof useProjectsWithTasks>["mutate"];
}

/**
 * 工数一覧用の案件・タスクマスタを取得します。
 *
 * @param selectedProjectId 選択中の案件ID（省略可）
 * @returns 案件・タスクのオプションとローディング状態
 */
export function useEffortListProjects(
  selectedProjectId?: number,
): EffortListProjectsResult {
  const { data, error, isLoading, mutate } = useProjectsWithTasks();

  useEffect(() => {
    if (!error) return;
    showErrorToast("案件の取得に失敗しました");
    void reportUiError(error, { message: "Failed to fetch projects" });
  }, [error]);

  const projectOptions: ProjectWithTasks[] = useMemo(() => {
    if (!data) return [];
    return data.map((project) => ({
      id: project.id,
      name: project.name,
      created_at: project.created_at,
      tasks:
        project.tasks?.map((task) => ({
          id: task.id,
          name: task.name,
          created_at: task.created_at,
        })) ?? [],
    }));
  }, [data]);

  const taskOptions = useMemo(() => {
    if (!projectOptions.length) return [];
    if (!selectedProjectId) {
      const map = new Map<number, string>();
      for (const project of projectOptions) {
        for (const task of project.tasks ?? []) {
          if (!map.has(task.id)) {
            map.set(task.id, task.name);
          }
        }
      }
      return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }
    const project: ProjectWithTasks | undefined = projectOptions.find(
      (p) => p.id === selectedProjectId,
    );
    if (!project) return [];
    return (project.tasks ?? []).map((task) => ({
      id: task.id,
      name: task.name,
    }));
  }, [projectOptions, selectedProjectId]);

  return {
    projectOptions,
    taskOptions,
    isLoading: Boolean(isLoading && !error),
    mutateProjects: mutate,
  };
}
