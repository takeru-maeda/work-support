import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import { buildUserScopedKey } from "@/lib/utils";
import {
  ProjectsResponseSchema,
  type ProjectWithTasks,
  type ProjectsResponse,
} from "@shared/schemas/projects";

const PROJECTS_CACHE_KEY = "projects-with-tasks";

/**
 * 案件と関連タスクの一覧を取得します。
 *
 * @returns ユーザーに紐づく案件・タスク
 */
export const fetchProjectsWithTasks = async (): Promise<ProjectWithTasks[]> => {
  const response = await apiClient.get(API_ENDPOINTS.projects);
  const parsed: ProjectsResponse = ProjectsResponseSchema.parse(response.data);
  return parsed.projects;
};

/**
 * 案件と関連タスクを SWR で取得します。
 *
 * @param config SWR の設定
 * @returns SWR レスポンス
 */
export const useProjectsWithTasks = (
  config?: SWRConfiguration<ProjectWithTasks[], Error>,
): SWRResponse<ProjectWithTasks[], Error> => {
  const cacheKey: string = buildUserScopedKey(PROJECTS_CACHE_KEY);

  return useSWR<ProjectWithTasks[], Error>(
    cacheKey,
    fetchProjectsWithTasks,
    config,
  );
};
