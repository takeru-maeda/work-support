import dayjs from "dayjs";

import {
  GOAL_PERIOD_MESSAGES,
  goalPeriodOverlapMessage,
  toCents,
} from "../../../../shared/src/utils/goalPeriod";
import { calculateGoalSummaries } from "../../../../shared/src/utils/goalProgress";
import { AppError } from "../../lib/errors";

import {
  createGoalPeriod,
  createGoalProgressHistory,
  deleteGoal,
  getGoalProgressHistoriesUntil,
  getGoalsByUser,
  getLatestGoals,
  GoalPeriodOverlapError,
  searchGoals,
  updateGoal,
} from "./repository";

import type { GoalProgressHistoryMini } from "./repository";
import type {
  GoalHistoryQuery,
  GoalPeriodCreateRequest,
  GoalPreviousWeekProgress,
  GoalUpdateRequest,
} from "./types";
import type { Database, Tables } from "../../../../shared/src/types/db";
import type { SupabaseClient } from "@supabase/supabase-js";

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

/** 重みの合計の目標値（小数第 2 位まで、100 倍した整数で比べる） */
const TOTAL_WEIGHT_CENTS = 100 * 100;

/**
 * DB を読まずに決まる確認と、現在の期間との重なりを、決まった順に確かめます。
 *
 * @param period 作ろうとしている期間と目標
 * @param latestEndDate 現在の期間の終了日（YYYY-MM-DD）。目標が無ければ undefined
 * @returns 外れた確認の文（終了日 → 重なり → 目標名 → 重みの順。通れば空）
 */
export const checkGoalPeriod = (
  period: GoalPeriodCreateRequest,
  latestEndDate: string | undefined,
): string[] => {
  const errors: string[] = [];
  // YYYY-MM-DD は文字列のまま比べても日付の前後と一致する
  if (period.end_date <= period.start_date) {
    errors.push(GOAL_PERIOD_MESSAGES.endBeforeStart);
  }
  if (latestEndDate !== undefined && period.start_date <= latestEndDate) {
    errors.push(goalPeriodOverlapMessage(latestEndDate));
  }
  if (period.goals.some((goal) => goal.title.trim() === "")) {
    errors.push(GOAL_PERIOD_MESSAGES.titleRequired);
  }
  const cents = period.goals.map((goal) => toCents(goal.weight));
  const total = cents.reduce((sum, value) => sum + value, 0);
  if (cents.some((value) => value <= 0) || total !== TOTAL_WEIGHT_CENTS) {
    errors.push(GOAL_PERIOD_MESSAGES.weightTotal);
  }
  return errors;
};

/** 期間の作成を確かめた結果 */
export interface GoalPeriodValidation {
  /** 外れた確認の文（決まった順。通れば空） */
  errors: string[];
  /** この期間を作ると「過去の目標」に回り、画面から編集できなくなる今の目標 */
  lockedGoals: Tables<"goals">[];
}

/**
 * 目標の期間を作れるかを、作らずに確かめます（作成と、MCP のプレビューで使う）。
 *
 * @param supabase Supabaseクライアント
 * @param userId 期間を作るユーザーID
 * @param period 作ろうとしている期間と目標
 * @returns 外れた確認の文と、編集できなくなる今の目標
 */
export const validateGoalPeriod = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  period: GoalPeriodCreateRequest,
): Promise<GoalPeriodValidation> => {
  const lockedGoals: Tables<"goals">[] = await getLatestGoals(supabase, userId);
  const latestEndDate: string | undefined = lockedGoals[0]?.end_date;
  return { errors: checkGoalPeriod(period, latestEndDate), lockedGoals };
};

/**
 * 目標の期間を、すべての目標とともに作ります。確認に外れたら何も作りません。
 *
 * @param supabase Supabaseクライアント
 * @param userId 期間を作るユーザーID
 * @param period 作る期間と目標
 * @returns 作った目標（本文の順）
 * @throws 確認に外れたら、最初に外れた確認の文の AppError(400)
 */
export const createGoalPeriodService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  period: GoalPeriodCreateRequest,
): Promise<Tables<"goals">[]> => {
  const { errors } = await validateGoalPeriod(supabase, userId, period);
  if (errors.length > 0) throw new AppError(400, errors[0]);

  try {
    return await createGoalPeriod(supabase, userId, period);
  } catch (error) {
    // 確認のあとに、同じユーザーの別の期間が先に作られた（AC-goals-24）
    if (error instanceof GoalPeriodOverlapError) {
      throw new AppError(400, goalPeriodOverlapMessage(error.latestEndDate));
    }
    throw error;
  }
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
