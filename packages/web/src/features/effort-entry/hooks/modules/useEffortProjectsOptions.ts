import { useEffect } from "react";
import type { KeyedMutator } from "swr";

import { showErrorToast } from "@/lib/toast";
import { reportUiError } from "@/services/logs";
import { useProjectsWithTasks } from "@/services/projects";
import type { EffortProjectOption } from "@/features/effort-entry/types";
import type { ProjectWithTasks } from "@shared/schemas/projects";

interface EffortProjectsOptionsResult {
  projectOptions: EffortProjectOption[];
  isProjectLoading: boolean;
  mutateProjects: KeyedMutator<ProjectWithTasks[]>;
}

/**
 * 案件マスタ取得の状態を提供します。
 *
 * @returns 案件一覧とローディング状態
 */
export function useEffortProjectsOptions(): EffortProjectsOptionsResult {
  const { data, error, isLoading, mutate } = useProjectsWithTasks();
  const projectOptions: EffortProjectOption[] = data ?? [];
  const isProjectLoading: boolean = Boolean(isLoading && !error);

  useEffect(() => {
    if (!error) return;
    showErrorToast("案件の取得に失敗しました");
    void reportUiError(error, { message: "Failed to fetch projects" });
  }, [error]);

  return {
    projectOptions,
    isProjectLoading,
    mutateProjects: mutate,
  };
}
