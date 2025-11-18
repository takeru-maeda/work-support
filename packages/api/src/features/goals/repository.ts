import { SupabaseClient } from "@supabase/supabase-js";
import dayjs from "dayjs";

import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../../../../shared/src/types/db";
import {
  GoalCreateRequest,
  GoalHistoryQuery,
  GoalHistorySortOption,
  GoalUpdateRequest,
} from "./types";
import { AppError } from "../../lib/errors";

/**
 * 最新期間の目標を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を取得するユーザーID
 * @returns 最新期間に紐づく目標一覧
 */
export const getLatestGoals = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<"goals">[]> => {
  const latestEndDate: string | null | undefined = await getLastEndDateGoal(
    supabase,
    userId,
  );
  if (!latestEndDate) return [];

  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .eq("end_date", latestEndDate);

  if (error) {
    throw new AppError(500, `Failed to fetch goals: ${error.message}`, error);
  }
  return data;
};

/**
 * 目標を新規作成します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を作成するユーザーID
 * @param goal 作成する目標データ
 * @returns 作成された目標
 */
export const createGoal = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goal: GoalCreateRequest,
): Promise<Tables<"goals">> => {
  const body: TablesInsert<"goals"> = {
    title: goal.title,
    start_date: goal.start_date,
    end_date: goal.end_date,
    weight: goal.weight,
    progress: 0, // 新規作成時は必ず0%
    content: goal.content,
    user_id: userId,
  };
  const { data, error } = await supabase
    .from("goals")
    .insert(body)
    .select("*")
    .single();

  if (error) {
    throw new AppError(500, `Failed to create goal: ${error.message}`, error);
  }
  return data;
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
export const updateGoal = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: number,
  goal: GoalUpdateRequest,
): Promise<Tables<"goals">> => {
  const body: TablesUpdate<"goals"> = {};
  if (goal.title !== undefined) body.title = goal.title;
  if (goal.start_date !== undefined) body.start_date = goal.start_date;
  if (goal.end_date !== undefined) body.end_date = goal.end_date;
  if (goal.weight !== undefined) body.weight = goal.weight;
  if (goal.progress !== undefined) body.progress = goal.progress;
  if (goal.content !== undefined) body.content = goal.content;
  const { data, error } = await supabase
    .from("goals")
    .update(body)
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to update goal: ${error.message}`, error);
  }
  if (!data) {
    throw new AppError(400, "Goal not found for the given user and id");
  }
  return data;
};

/**
 * 目標を削除します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を削除するユーザーID
 * @param goalId 削除対象の目標ID
 * @returns 削除された目標
 */
export const deleteGoal = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: number,
): Promise<Tables<"goals">> => {
  const { data: deletedGoal, error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to delete goal: ${error.message}`, error);
  }
  if (!deletedGoal) {
    throw new AppError(400, "Goal not found for the given user and id");
  }
  return deletedGoal;
};

/**
 * 目標進捗履歴を追加します。
 *
 * @param supabase Supabaseクライアント
 * @param goalId 進捗を記録する目標ID
 * @param progress 記録する進捗率
 * @returns なし
 */
export const createGoalProgressHistory = async (
  supabase: SupabaseClient<Database>,
  goalId: number,
  progress: number,
): Promise<void> => {
  const { error } = await supabase.from("goal_progress_histories").insert({
    goal_id: goalId,
    progress: progress,
    recorded_at: new Date().toISOString(),
  });

  if (error) {
    const message = `Failed to create goal progress history: ${error.message}`;
    throw new AppError(500, message, error);
  }
};

/**
 * ユーザーの目標のうち最も未来の終了日を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を検索するユーザーID
 * @returns 最新の終了日
 */
async function getLastEndDateGoal(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null | undefined> {
  const { data, error } = await supabase
    .from("goals")
    .select("end_date")
    .eq("user_id", userId)
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to fetch goal: ${error.message}`, error);
  }
  return data?.end_date;
}

/**
 * ユーザーの全目標を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を取得するユーザーID
 * @returns 目標一覧
 */
export const getGoalsByUser = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<"goals">[]> => {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    const message = `Failed to fetch goals: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return data ?? [];
};

export interface GoalProgressHistoryMini {
  goal_id: number;
  progress: number;
  recorded_at: string;
}

/**
 * 指定日以前の目標進捗履歴を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 進捗を取得するユーザーID
 * @param endDate 取得対象の終了日（YYYY-MM-DD）
 * @returns 進捗履歴の配列
 */
export const getGoalProgressHistoriesUntil = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  endDate: string,
): Promise<GoalProgressHistoryMini[]> => {
  const endDateTime: string = dayjs(endDate).endOf("day").toISOString();
  const { data, error } = await supabase
    .from("goal_progress_histories")
    .select("goal_id, progress, recorded_at, goals!inner(user_id)")
    .eq("goals.user_id", userId)
    .lte("recorded_at", endDateTime)
    .order("goal_id", { ascending: true })
    .order("recorded_at", { ascending: false });

  if (error) {
    const message = `Failed to fetch goal progress histories: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return (data ?? []).map((row) => ({
    goal_id: row.goal_id,
    progress: row.progress,
    recorded_at: row.recorded_at,
  }));
};

const SORT_COLUMNS: Record<
  GoalHistorySortOption,
  { column: GoalHistorySortOption; ascending: boolean }
> = {
  title: { column: "title", ascending: true },
  "-title": { column: "title", ascending: false },
  weight: { column: "weight", ascending: true },
  "-weight": { column: "weight", ascending: false },
  progress: { column: "progress", ascending: true },
  "-progress": { column: "progress", ascending: false },
  start_date: { column: "start_date", ascending: true },
  "-start_date": { column: "start_date", ascending: false },
  end_date: { column: "end_date", ascending: true },
  "-end_date": { column: "end_date", ascending: false },
};

const DEFAULT_SORT = SORT_COLUMNS["-end_date"];

/**
 * 条件を指定して過去の目標を検索します。
 *
 * @param supabase Supabaseクライアント
 * @param userId 目標を検索するユーザーID
 * @param query 検索条件
 * @returns 検索結果と総件数
 */
export const searchGoals = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  query: GoalHistoryQuery,
): Promise<{
  items: Tables<"goals">[];
  total: number;
}> => {
  const { sort = "-end_date", page, pageSize } = query;
  const sortOption = SORT_COLUMNS[sort] ?? DEFAULT_SORT;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = supabase
    .from("goals")
    .select("*", { count: "exact" })
    .eq("user_id", userId);

  if (query.query) {
    builder = builder.or(
      `title.ilike.%${query.query}%,content.ilike.%${query.query}%`,
    );
  }

  if (query.startDate) {
    builder = builder.gte("start_date", query.startDate);
  }

  if (query.endDate) {
    builder = builder.lte("end_date", query.endDate);
  }

  if (query.minProgress !== undefined) {
    builder = builder.gte("progress", query.minProgress);
  }

  if (query.maxProgress !== undefined) {
    builder = builder.lte("progress", query.maxProgress);
  }

  const { data, error, count } = await builder
    .order(sortOption.column, { ascending: sortOption.ascending })
    .range(from, to);

  if (error) {
    const message = `Failed to search goals: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return {
    items: data ?? [],
    total: count ?? 0,
  };
};
