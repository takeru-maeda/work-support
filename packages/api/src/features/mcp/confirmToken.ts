import type { GoalPeriodCreateRequest } from "../../../../shared/src/schemas/goals";
import type { Tables } from "../../../../shared/src/types/db";

/**
 * create_goal_period の確認トークンを作ります（AC-mcp-12）。
 *
 * ユーザー、入力、今の期間（終了日と目標の ID）を SHA-256 にかけた値で、秘密の値も期限も持たない。
 * 認可のためではなく、「このプレビューを見た」ことと「プレビューのあとに入力も状況も変わっていない」
 * ことを確かめるための値。状況が変われば一致しなくなるので、期限が無くても古いプレビューでは作れない。
 *
 * @param userId ユーザー ID
 * @param period 作る期間と目標
 * @param lockedGoals この期間で編集できなくなる今の目標
 * @returns 16 進の文字列（64 文字）
 */
export const createConfirmToken = async (
  userId: string,
  period: GoalPeriodCreateRequest,
  lockedGoals: Tables<"goals">[],
): Promise<string> => {
  const material = JSON.stringify({
    userId,
    startDate: period.start_date,
    endDate: period.end_date,
    goals: period.goals.map((goal) => [goal.title, goal.content, goal.weight]),
    currentEndDate: lockedGoals[0]?.end_date ?? null,
    currentGoalIds: lockedGoals.map((goal) => goal.id).sort((a, b) => a - b),
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(material),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};
