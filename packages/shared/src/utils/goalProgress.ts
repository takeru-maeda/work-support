export interface GoalProgressLike {
  progress: number;
  weight: number;
}

export interface GoalProgressSummary {
  simpleAverageProgress: number;
  weightedAchievementRate: number;
}

/**
 * 目標進捗の集計を行います
 *
 * @param goals 目標
 * @returns ウェイトを加算しない進捗率と加重進捗率
 */
export const calculateGoalSummaries = <T extends GoalProgressLike>(
  goals: T[],
): GoalProgressSummary | null => {
  if (!goals || goals.length === 0) return null;

  const totalWeight: number = goals.reduce((sum, goal) => sum + goal.weight, 0);
  if (totalWeight === 0) return null;

  const simpleAverageProgress: number =
    goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length;

  const weightedAchievementRate: number =
    goals.reduce((sum, goal) => sum + goal.progress * goal.weight, 0) /
    totalWeight;

  return {
    simpleAverageProgress: Number.parseFloat(simpleAverageProgress.toFixed(1)),
    weightedAchievementRate: Number.parseFloat(
      weightedAchievementRate.toFixed(1),
    ),
  };
};
