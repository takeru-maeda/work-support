import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "../../../../shared/src/types/db";
import {
  GoalCreateRequest,
  GoalHistoryQuery,
  GoalPreviousWeekProgress,
  GoalUpdateRequest,
} from "./types";
import {
  createGoal,
  createGoalProgressHistory,
  deleteGoal,
  getGoalProgressHistoriesUntil,
  getGoalsByUser,
  getLatestGoals,
  GoalProgressHistoryMini,
  searchGoals,
  updateGoal,
} from "./repository";
import { calculateGoalSummaries } from "../../../../shared/src/utils/goalProgress";
import { AppError } from "../../lib/errors";
import dayjs from "dayjs";

/**
 * 最新期間の目標を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を取得するユーザーID
 * @returns 最新期間の目標一覧
 */
export const getLatestGoalsService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<"goals">[]> => {
  return await getLatestGoals(supabase, userId);
};

/**
 * 目標を新規作成します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を作成するユーザーID
 * @param goal 作成する目標データを指定
 * @returns 作成された目標
 */
export const createGoalService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goal: GoalCreateRequest,
): Promise<Tables<"goals">> => {
  return await createGoal(supabase, userId, goal);
};

/**
 * 目標を更新します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を更新するユーザーID
 * @param goalId 更新対象の目標ID
 * @param goal 更新内容
 * @returns 更新後の目標
 */
export const updateGoalService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: number,
  goal: GoalUpdateRequest,
): Promise<Tables<"goals">> => {
  const updatedGoal: Tables<"goals"> = await updateGoal(
    supabase,
    userId,
    goalId,
    goal,
  );

  if (goal.progress !== undefined) {
    await createGoalProgressHistory(supabase, goalId, updatedGoal.progress);
  }
  return updatedGoal;
};

/**
 * 目標を削除します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を削除するユーザーID
 * @param goalId 削除対象の目標ID
 * @returns 削除された目標
 */
export const deleteGoalService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: number,
): Promise<Tables<"goals">> => {
  return await deleteGoal(supabase, userId, goalId);
};

/**
 * 条件を指定して過去の目標を検索します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を検索するユーザーID
 * @param query 検索条件
 * @returns 検索結果と総件数
 */
export const searchGoalsService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  query: GoalHistoryQuery,
): Promise<{
  items: Tables<"goals">[];
  total: number;
}> => {
  return await searchGoals(supabase, userId, query);
};

/**
 * 前週末時点の目標進捗を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 進捗を取得するユーザーID
 * @param referenceDate 基準日（当週内の日付）
 * @returns 前週末時点の進捗データ
 */
export const getPreviousWeekProgressService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  referenceDate: string,
): Promise<GoalPreviousWeekProgress> => {
  const { previousSunday, reference } = getPreviousWeekSunday(referenceDate);

  const goals: Tables<"goals">[] = await getGoalsByUser(supabase, userId);
  const histories: GoalProgressHistoryMini[] =
    await getGoalProgressHistoriesUntil(supabase, userId, previousSunday); //TODO: 時差が怪しい

  const latestHistoryByGoal = new Map<number, (typeof histories)[number]>();
  for (const history of histories) {
    if (!latestHistoryByGoal.has(history.goal_id)) {
      latestHistoryByGoal.set(history.goal_id, history);
    }
  }

  const progress = goals
    .map((goal) => {
      const history: GoalProgressHistoryMini | undefined =
        latestHistoryByGoal.get(goal.id);
      if (history) {
        return {
          goal_id: goal.id,
          progress: history.progress,
          recorded_at: history.recorded_at.slice(0, 10), //TODO: 時差が怪しい
          source: "history" as const,
        };
      }
      const isCreatedInThisWeek: boolean =
        dayjs(goal.created_at) > dayjs(previousSunday);
      return {
        goal_id: goal.id,
        progress: isCreatedInThisWeek ? 0 : goal.progress,
        recorded_at: isCreatedInThisWeek
          ? goal.created_at.slice(0, 10) //TODO: 時差が怪しい
          : previousSunday,
        source: "goal" as const,
      };
    })
    .sort((a, b) => a.goal_id - b.goal_id);

  return {
    referenceDate: reference,
    previousWeekEnd: previousSunday,
    progress,
  };
};

/**
 * 目標の進捗サマリーを計算します。
 *
 * @param goals 対象の目標一覧
 * @returns 進捗サマリー
 */
export const getGoalSummaryMetrics = (
  goals: Tables<"goals">[],
): {
  simpleAverageProgress: number;
  weightedAchievementRate: number;
} | null => {
  return calculateGoalSummaries(
    goals.map((goal) => ({
      progress: goal.progress,
      weight: goal.weight,
    })),
  );
};

/**
 * 日付を `YYYY-MM-DD` 形式へ整形します。
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 基準日を含む週の前週日曜日を算出します。
 */
function getPreviousWeekSunday(referenceDate: string): {
  reference: string;
  previousSunday: string;
} {
  const reference = new Date(referenceDate);
  if (Number.isNaN(reference.getTime())) {
    throw new AppError(400, "Invalid reference date");
  }
  const day: number = reference.getDay();
  const diffToMonday: number = (day + 6) % 7;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() - 1);

  return {
    reference: formatDate(reference),
    previousSunday: formatDate(sunday),
  };
}
