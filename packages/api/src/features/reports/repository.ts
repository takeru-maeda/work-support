import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "../../../../shared/src/schemas/db";
import { AppError } from "../../lib/errors";
import { Effort } from "./types";

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
