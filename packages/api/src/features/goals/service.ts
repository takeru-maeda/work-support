import { SupabaseClient } from "@supabase/supabase-js";
import { Database, Tables } from "../../../../shared/src/types/db";
import { GoalCreateRequest, GoalUpdateRequest } from "./types";
import {
  createGoal,
  createGoalProgressHistory,
  deleteGoal,
  getLatestGoals,
  updateGoal,
} from "./repository";

export const getLatestGoalsService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Tables<"goals">[]> => {
  return await getLatestGoals(supabase, userId);
};

export const createGoalService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goal: GoalCreateRequest,
): Promise<Tables<"goals">> => {
  return await createGoal(supabase, userId, goal);
};

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

export const deleteGoalService = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  goalId: number,
): Promise<Tables<"goals">> => {
  return await deleteGoal(supabase, userId, goalId);
};
