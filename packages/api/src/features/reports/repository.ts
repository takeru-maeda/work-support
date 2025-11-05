import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "../../../../shared/src/types/db";
import { AppError } from "../../lib/errors";
import {
  Effort,
  WorkRecordListQuery,
  WorkRecordSort,
  WorkRecordWithRelations,
} from "./types";

/**
 * 週報向けの工数記録を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param startDate 期間開始日
 * @param endDate 期間終了日
 * @returns 工数記録
 */
export const getWorkRecordsForReport = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<Effort[]> => {
  const { data, error } = await supabase
    .from("work_records")
    .select(
      `
      work_date,
      hours,
      tasks ( name, projects ( name ) )
    `,
    )
    .eq("user_id", userId)
    .gte("work_date", startDate.toISOString())
    .lte("work_date", endDate.toISOString())
    .order("work_date", { ascending: true });

  if (error) {
    const message = `Failed to fetch work records: ${error.message}`;
    throw new AppError(500, message, error);
  }
  return data;
};

/**
 * 週報対象期間と重なる目標を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param startDate 期間開始日
 * @param endDate 期間終了日
 * @returns 目標一覧
 */
export const getGoalsForReport = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<Tables<"goals">[]> => {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    // 目標の期間がレポート期間と一部でも重複していれば取得
    .lte("start_date", endDate.toISOString()) // 目標の開始日 <= レポートの終了日
    .gte("end_date", startDate.toISOString()); // 目標の終了日 >= レポートの開始日

  if (error) {
    throw new AppError(500, `Failed to fetch goals: ${error.message}`, error);
  }
  return data;
};

/**
 * 週報向けのミッションを取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @returns ミッション
 */
export const getMissionForReport = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ content: string | null } | null> => {
  const { data, error } = await supabase
    .from("missions")
    .select("content")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new AppError(500, `Failed to fetch mission: ${error.message}`, error);
  }

  return data;
};

/**
 * 目標進捗履歴を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param goalIds 目標ID一覧
 * @param endDate 取得対象の終了日
 * @returns 進捗履歴
 */
export const getGoalProgressHistories = async (
  supabase: SupabaseClient<Database>,
  goalIds: number[],
  endDate: Date,
): Promise<Tables<"goal_progress_histories">[]> => {
  const { data, error } = await supabase
    .from("goal_progress_histories")
    .select("*")
    .in("goal_id", goalIds)
    .lte("recorded_at", endDate.toISOString())
    .order("recorded_at", { ascending: false });

  if (error) {
    const message = `Failed to fetch goal progress histories: ${error.message}`;
    throw new AppError(500, message, error);
  }
  return data;
};

const WORK_RECORD_SORT_MAP: Record<
  WorkRecordSort,
  Array<{ column: string; ascending: boolean }>
> = {
  date: [{ column: "work_date", ascending: true }],
  "-date": [{ column: "work_date", ascending: false }],
  project: [
    { column: "project_name", ascending: true },
    { column: "task_name", ascending: true },
    { column: "work_date", ascending: true },
  ],
  "-project": [
    { column: "project_name", ascending: false },
    { column: "task_name", ascending: true },
    { column: "work_date", ascending: true },
  ],
  task: [
    { column: "task_name", ascending: true },
    { column: "project_name", ascending: true },
    { column: "work_date", ascending: true },
  ],
  "-task": [
    { column: "task_name", ascending: false },
    { column: "project_name", ascending: true },
    { column: "work_date", ascending: true },
  ],
  estimated_hours: [{ column: "estimated_hours", ascending: true }],
  "-estimated_hours": [{ column: "estimated_hours", ascending: false }],
  hours: [{ column: "hours", ascending: true }],
  "-hours": [{ column: "hours", ascending: false }],
  diff: [{ column: "hours_diff", ascending: true }],
  "-diff": [{ column: "hours_diff", ascending: false }],
};

/**
 * 工数一覧を取得します。
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param query クエリ
 * @returns 工数データと件数
 */
export const getWorkRecordList = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  query: WorkRecordListQuery,
): Promise<{ items: WorkRecordWithRelations[]; total: number }> => {
  const { sort = "-date", page, pageSize } = query;
  const sortOption = WORK_RECORD_SORT_MAP[sort];
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let builder = supabase
    .from("work_record_diffs")
    .select(
      `
        id,
        user_id,
        task_id,
        work_date,
        hours,
        estimated_hours,
        hours_diff,
        created_at,
        task_name,
        project_name
      `,
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (query.date) {
    builder = builder.eq("work_date", query.date);
  }

  if (query.project) {
    builder = builder.ilike("project_name", `%${query.project}%`);
  }

  if (query.task) {
    builder = builder.ilike("task_name", `%${query.task}%`);
  }

  for (const order of sortOption) {
    builder = builder.order(order.column, {
      ascending: order.ascending,
    });
  }

  const { data, error, count } = await builder.range(from, to);

  if (error) {
    const message = `Failed to fetch work records: ${error.message}`;
    throw new AppError(500, message, error);
  }

  return {
    items: (data ?? []) as WorkRecordWithRelations[],
    total: count ?? 0,
  };
};
