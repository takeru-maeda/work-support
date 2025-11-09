import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import { useUserStore } from "@/store/user";
import useSWR, {
  mutate,
  type BareFetcher,
  type SWRConfiguration,
  type SWRResponse,
} from "swr";
import {
  CreateGoalRequestSchema,
  CreateGoalResponseSchema,
  GetGoalResponseSchema,
  GoalHistoryQuerySchema,
  GoalHistoryResponseSchema,
  GoalPreviousWeekProgressSchema,
  GoalPreviousWeekQuerySchema,
  UpdateGoalRequestSchema,
  UpdateGoalResponseSchema,
  type GoalCreateRequest,
  type GoalCreateResponse,
  type GoalGetResponse,
  type GoalHistoryQuery,
  type GoalHistoryResponse,
  type GoalPreviousWeekProgress,
  type GoalPreviousWeekQuery,
  type GoalUpdateRequest,
  type GoalUpdateResponse,
} from "@shared/schemas/goals";
import type { Goal } from "@/features/goals/types";
import { buildUserScopedKey } from "@/lib/utils";
/**
 * 目標を新規作成します。
 *
 * @param payload 作成する目標
 * @returns 作成された目標
 */
export const createGoal = async (payload: GoalCreateRequest): Promise<Goal> => {
  const requestBody: GoalCreateRequest = CreateGoalRequestSchema.parse(payload);

  const response = await apiClient.post(API_ENDPOINTS.goals, requestBody);
  const parsed: GoalCreateResponse = CreateGoalResponseSchema.parse(
    response.data,
  );

  const mapped: Goal = mapGoalDtoToGoal(parsed.created);
  void mutate(getCurrentGoalsCacheKey());
  return mapped;
};

/**
 * 最新の目標を取得します。
 *
 * @returns 最新期間の目標リスト
 */
export const getCurrentGoals = async (): Promise<Goal[]> => {
  const response = await apiClient.get(API_ENDPOINTS.goalsCurrent);
  const parsed: GoalGetResponse = GetGoalResponseSchema.parse(response.data);
  return parsed.goals.map(mapGoalDtoToGoal);
};

/**
 * 目標を更新します。
 *
 * @param goalId 更新対象のID
 * @param payload 更新内容
 * @returns 更新後の目標
 */
export const updateGoal = async (
  goalId: number,
  payload: GoalUpdateRequest,
): Promise<Goal> => {
  const requestBody: GoalUpdateRequest = UpdateGoalRequestSchema.parse(payload);
  const response = await apiClient.put(
    `${API_ENDPOINTS.goals}/${goalId}`,
    requestBody,
  );
  const parsed: GoalUpdateResponse = UpdateGoalResponseSchema.parse(
    response.data,
  );
  const mapped: Goal = mapGoalDtoToGoal(parsed.updated);
  void mutate(getCurrentGoalsCacheKey());
  return mapped;
};

/**
 * 目標を削除します。
 *
 * @param goalId 削除対象のID
 * @returns 実行結果
 */
export const deleteGoal = async (goalId: number): Promise<void> => {
  await apiClient.delete(`${API_ENDPOINTS.goals}/${goalId}`);
  void mutate(getCurrentGoalsCacheKey());
};

/**
 * 前週末時点の進捗率を取得します。
 *
 * @param query クエリパラメータ
 * @returns 進捗履歴
 */
export const getPreviousWeekProgress = async (
  query: GoalPreviousWeekQuery,
): Promise<GoalPreviousWeekProgress> => {
  const validatedQuery: GoalPreviousWeekQuery =
    GoalPreviousWeekQuerySchema.parse(query);

  const response = await apiClient.get(
    API_ENDPOINTS.goalsPreviousWeekProgress,
    { params: validatedQuery },
  );
  return GoalPreviousWeekProgressSchema.parse(response.data);
};

/**
 * 過去の目標を検索します。
 *
 * @param query 検索条件
 * @returns 目標履歴
 */
export const searchGoals = async (
  query: GoalHistoryQuery,
): Promise<GoalHistoryResponse> => {
  const validatedQuery: GoalHistoryQuery = GoalHistoryQuerySchema.parse(query);
  const response = await apiClient.get(API_ENDPOINTS.goalsHistory, {
    params: validatedQuery,
  });
  return GoalHistoryResponseSchema.parse(response.data);
};

/**
 * 最新目標を SWR で取得します。
 *
 * @param config SWRの設定
 * @returns SWR レスポンス（目標配列）
 */
export const useCurrentGoals = (
  config?: SWRConfiguration<Goal[], Error>,
): SWRResponse<
  Goal[],
  Error,
  SWRConfiguration<Goal[], Error, BareFetcher<Goal[]>> | undefined
> => {
  const key: string = getCurrentGoalsCacheKey();
  return useSWR<Goal[], Error>(key, getCurrentGoals, config);
};

/**
 * 前週進捗を SWR で取得します。
 *
 * @param query クエリパラメータ
 * @param config SWR の設定
 * @returns SWR レスポンス（前週進捗）
 */
export const usePreviousWeekProgress = (
  query: GoalPreviousWeekQuery | null,
  config?: SWRConfiguration<GoalPreviousWeekProgress, Error>,
): SWRResponse<
  GoalPreviousWeekProgress,
  Error,
  | SWRConfiguration<
      GoalPreviousWeekProgress,
      Error,
      BareFetcher<GoalPreviousWeekProgress>
    >
  | undefined
> => {
  const userId: string | null = useUserStore((state) => state.user?.id ?? null);
  const key: string | null =
    query && userId
      ? getPreviousWeekProgressCacheKey(userId, query.referenceDate)
      : null;

  return useSWR<GoalPreviousWeekProgress>(
    key,
    () => {
      if (!query) throw new Error("Previous week query is not defined");
      return getPreviousWeekProgress(query);
    },
    config,
  );
};

/**
 * 過去目標を SWR で検索します。
 *
 * @param query 検索条件
 * @param config SWR の設定
 * @returns SWR レスポンス（目標履歴）
 */
export const useGoalHistory = (
  query: GoalHistoryQuery | null,
  config?: SWRConfiguration<GoalHistoryResponse, Error>,
): SWRResponse<
  GoalHistoryResponse,
  Error,
  | SWRConfiguration<
      GoalHistoryResponse,
      Error,
      BareFetcher<GoalHistoryResponse>
    >
  | undefined
> => {
  const userId: string | null = useUserStore((state) => state.user?.id ?? null);
  const key: string | null =
    query && userId ? getGoalHistoryCacheKey(userId, query) : null;

  return useSWR<GoalHistoryResponse>(
    key,
    () => {
      if (!query) throw new Error("Goal history query is not defined");
      return searchGoals(query);
    },
    config,
  );
};

/**
 * 目標DTOをUIで扱うGoalエンティティへ変換します。
 *
 * @param goal APIから取得した目標
 * @returns 変換後のGoal
 */
function mapGoalDtoToGoal(goal: {
  id: number;
  title: string;
  weight: number;
  progress: number;
  content: string | null;
  start_date: string;
  end_date: string;
}): Goal {
  return {
    id: goal.id,
    name: goal.title,
    weight: goal.weight,
    progress: goal.progress,
    content: goal.content ?? null,
    startDate: new Date(goal.start_date),
    endDate: new Date(goal.end_date),
  };
}

/**
 * 現在の目標を管理するキャッシュのキーを取得します。
 *
 * @returns 現在の目標を管理するキャッシュのキー
 */
function getCurrentGoalsCacheKey(): string {
  return buildUserScopedKey(API_ENDPOINTS.goalsCurrent);
}

/**
 * 前週進捗のキャッシュキーを取得します。
 *
 * @param userId ユーザーID
 * @param referenceDate 参照日
 * @returns キャッシュキー
 */
function getPreviousWeekProgressCacheKey(
  userId: string,
  referenceDate: string,
): string {
  return `${API_ENDPOINTS.goalsPreviousWeekProgress}_${userId}_${referenceDate}`;
}

/**
 * 目標履歴のキャッシュキーを取得します。
 *
 * @param userId ユーザーID
 * @param query クエリ
 * @returns キャッシュキー
 */
function getGoalHistoryCacheKey(
  userId: string,
  query: GoalHistoryQuery,
): string {
  const serialized: string = serializeGoalHistoryQuery(query);
  return `${API_ENDPOINTS.goalsHistory}_${userId}_${serialized}`;
}

/**
 * 目標履歴のクエリをシリアライズします。
 *
 * @param query クエリ
 * @returns シリアライズ文字列
 */
function serializeGoalHistoryQuery(query: GoalHistoryQuery): string {
  return Object.entries(query)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}
