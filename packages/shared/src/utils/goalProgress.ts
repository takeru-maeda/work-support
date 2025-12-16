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

  let totalWeight = 0;
  let totalProgress = 0;
  let weightedProgress = 0;

  for (const goal of goals) {
    totalWeight += goal.weight;
    totalProgress += goal.progress;
    weightedProgress += goal.progress * goal.weight;
  }

  if (totalWeight === 0) return null;

  const simpleAverageProgress: number = totalProgress / goals.length;
  const weightedAchievementRate: number = weightedProgress / totalWeight;

  return {
    simpleAverageProgress: Number.parseFloat(simpleAverageProgress.toFixed(1)),
    weightedAchievementRate: Number.parseFloat(
      weightedAchievementRate.toFixed(1),
    ),
  };
};
