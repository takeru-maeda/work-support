import { SupabaseClient } from "@supabase/supabase-js";
import {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "../../../../shared/src/types/db";
import { GoalCreateRequest, GoalUpdateRequest } from "./types";
import { AppError } from "../../lib/errors";

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

export const updateGoal = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: number,
  goal: GoalUpdateRequest,
): Promise<Tables<"goals">> => {
  const body: TablesUpdate<"goals"> = {
    title: goal.title,
    start_date: goal.start_date,
    end_date: goal.end_date,
    weight: goal.weight,
    progress: goal.progress,
    content: goal.content,
  };
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
