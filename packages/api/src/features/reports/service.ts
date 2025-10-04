import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables } from '../../../../shared/src/types/db';
import {
  getGoalsForReport,
  getGoalProgressHistories,
  getMissionForReport,
  getWorkRecordsForReport,
} from './repository';
import dayjs, { Dayjs } from 'dayjs';
import {
  Effort,
  GoalSummary,
  GoalWithProgressDiff,
  WeeklyReportData,
  WeeklyReportResponse,
} from './types';

/**
 * 週報の雛形を生成します
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param targetDate 週報出力対象の日付
 * @returns 週報の雛形
 */
export const generateFormattedReport = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  targetDate: Date,
): Promise<WeeklyReportResponse> => {
  const reportData = await getWeeklyReportData(supabase, userId, targetDate);

  const weeklyReport: string = formatWeeklyReport(
    reportData.startDate,
    reportData.workRecords,
    reportData.goals,
    reportData.goalSummary,
  );

  return {
    mission: reportData.mission,
    weeklyReport,
  };
};

/**
 * 週報出力用データを返します
 *
 * @param supabase Supabaseクライアント
 * @param userId ユーザーID
 * @param targetDate 出力対象の日付
 * @returns 週報出力用データ
 */
const getWeeklyReportData = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  targetDate: Date,
): Promise<WeeklyReportData> => {
  const { startDate, endDate } = getWeekRange(targetDate);
  const sunday: Date = dayjs(startDate).add(6, 'day').toDate();

  const [mission, workRecords, goals] = await Promise.all([
    getMissionForReport(supabase, userId),
    getWorkRecordsForReport(supabase, userId, startDate, endDate),
    getGoalsForReport(supabase, userId, startDate, endDate),
  ]);

  const startOfWeekGoals: Tables<'goals'>[] = await getStartOfWeekGoals(
    supabase,
    goals,
    startDate,
    sunday,
  );

  const goalSummary: GoalSummary | null = calculateGoalSummary(
    goals,
    startOfWeekGoals,
  );

  const goalsWithDiff: GoalWithProgressDiff[] = goals.map((goal) => {
    const startGoal: Tables<'goals'> | undefined = startOfWeekGoals.find(
      (g) => g.id === goal.id,
    );
    const progressDiff: number = goal.progress - (startGoal?.progress ?? 0);
    return { ...goal, progressDiff };
  });

  return {
    startDate,
    endDate,
    mission: mission?.content ?? null,
    workRecords,
    goals: goalsWithDiff,
    goalSummary,
  };
};

/**
 * 週の開始日（月曜日）と終了日（金曜日）を計算します
 *
 * @param date 日付（時間のない '2025-10-01' のようなデータを期待）
 * @returns 引数の日付の週の開始日（月曜日）と終了日（金曜日）
 */
function getWeekRange(date: Date): { startDate: Date; endDate: Date } {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    startDate: monday,
    endDate: friday,
  };
}

/**
 * 月曜日から日曜日の週次差分を取得するために各目標の週初め（月曜日）よりも前の最新の進捗率を取得します
 *
 * @param supabase　Supabaseクライアント
 * @param goals　週報出力期間の目標
 * @param startDate 週報出力対象の開始日
 * @param sunday 週報出力対象の週末（日曜日）
 * @returns 週初め（月曜日）よりも前の最新の進捗率が格納された目標
 */
async function getStartOfWeekGoals(
  supabase: SupabaseClient<Database>,
  goals: Tables<'goals'>[],
  startDate: Date,
  sunday: Date,
): Promise<Tables<'goals'>[]> {
  const goalIds: number[] = goals.map((g) => g.id);
  const histories: Tables<'goal_progress_histories'>[] =
    await getGoalProgressHistories(supabase, goalIds, sunday);

  return goals.map((goal) => {
    const beforeHistories: Tables<'goal_progress_histories'>[] = histories
      .filter(
        (h) =>
          h.goal_id === goal.id &&
          dayjs(h.recorded_at).isBefore(dayjs(startDate)),
      )
      .sort((a, b) => dayjs(b.recorded_at).diff(dayjs(a.recorded_at)));

    const startProgress: number = beforeHistories[0]?.progress ?? 0;

    return { ...goal, progress: startProgress };
  });
}

/**
 * 目標進捗サマリーを計算します
 *
 * @param goals 目標
 * @returns 目標進捗サマリー
 */
function calculateGoalSummary(
  endOfWeekGoals: Tables<'goals'>[],
  startOfWeekGoals: Tables<'goals'>[],
): GoalSummary | null {
  if (!endOfWeekGoals || endOfWeekGoals.length === 0) return null;

  const endOfWeekSummary = calculateWeightedSummary(endOfWeekGoals);
  const startOfWeekSummary = calculateWeightedSummary(startOfWeekGoals);

  if (!endOfWeekSummary || !startOfWeekSummary) return null;

  // 進捗率の期待値
  const expectedValue: number = calculateExpectedProgress({
    startDate: endOfWeekGoals[0].start_date,
    endDate: endOfWeekGoals[0].end_date,
  });

  // 加重進捗率と期待値の差分
  const differenceFromExpected: number =
    endOfWeekSummary.weightedAchievementRate - expectedValue;

  // ウェイトを加算しない進捗率の差分（進捗）
  const simpleAverageProgressDiff: number =
    endOfWeekSummary.simpleAverageProgress -
    startOfWeekSummary.simpleAverageProgress;

  // 加重進捗率の差分（進捗）
  const weightedAchievementRateDiff =
    endOfWeekSummary.weightedAchievementRate -
    startOfWeekSummary.weightedAchievementRate;

  return {
    simpleAverageProgress: endOfWeekSummary.simpleAverageProgress,
    simpleAverageProgressDiff,
    weightedAchievementRate: endOfWeekSummary.weightedAchievementRate,
    weightedAchievementRateDiff,
    expectedValue: parseFloat(expectedValue.toFixed(1)),
    differenceFromExpected: parseFloat(differenceFromExpected.toFixed(1)),
  };
}

/**
 * 加重進捗率を計算します
 *
 * @param goals 目標
 * @returns ウェイトを加算しない進捗率と加重進捗率
 */
function calculateWeightedSummary(goals: Tables<'goals'>[]): {
  simpleAverageProgress: number;
  weightedAchievementRate: number;
} | null {
  if (!goals || goals.length === 0) return null;

  // ウェイトの合計
  const totalWeight: number = goals.reduce((sum, goal) => sum + goal.weight, 0);
  if (totalWeight === 0) return null;

  // ウェイトを加算しない進捗率の平均
  const simpleAverageProgress: number =
    goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length;

  // 加重進捗率
  const weightedAchievementRate: number =
    goals.reduce((sum, goal) => sum + goal.progress * goal.weight, 0) /
    totalWeight;

  return {
    simpleAverageProgress: parseFloat(simpleAverageProgress.toFixed(1)),
    weightedAchievementRate: parseFloat(weightedAchievementRate.toFixed(1)),
  };
}

/**
 * 進捗率の期待値を計算します
 *
 * @param dayRange 目標の対象期間の範囲
 * @returns 進捗率の期待値(%)
 */
function calculateExpectedProgress(dayRange: {
  startDate: string;
  endDate: string;
}): number {
  const startDate: Dayjs = dayjs(dayRange.startDate);
  const endDate: Dayjs = dayjs(dayRange.endDate);

  const totalDuration: number = Math.max(1, endDate.diff(startDate, 'day'));
  const elapsedDuration: number = Math.max(0, dayjs().diff(startDate, 'day'));

  return Math.min(100, (elapsedDuration / totalDuration) * 100);
}

/**
 * 週報の雛形を返します
 *
 * @param startDate 週報出力対象の開始日
 * @param workRecords 工数情報
 * @param goals 週報出力対象期間の目標情報
 * @param goalSummary 目標進捗サマリー
 * @returns 週報の雛形
 */
const formatWeeklyReport = (
  startDate: Date,
  workRecords: Effort[],
  goals: GoalWithProgressDiff[],
  goalSummary: GoalSummary | null,
): string => {
  const dailyStatus: string = formatDailyWorkStatus(workRecords, startDate);
  const projectStatus: string = formatProjectWorkStatus(workRecords);
  const learnStatus: string = getLearnStatusFormat();
  const goalStatus: string = formatGoalStatus(goals, goalSummary);

  const reportSections = [];
  if (dailyStatus) reportSections.push(dailyStatus);
  if (projectStatus) reportSections.push(projectStatus);
  reportSections.push(learnStatus);
  if (goalStatus) reportSections.push(goalStatus);

  return reportSections.join('\n\n\n');
};

/**
 * 日別業務状況を返します
 * 例）
 * <日別業務状況>
 * 09/15(月)：在宅 0h
 * 09/16(火)：在宅 11h
 * 09/17(水)：在宅 10h
 * 09/18(木)：在宅 8.5h
 * 09/19(金)：在宅 8h
 * 平均：9.4h/日
 * 合計：37.5h
 *
 * @param workRecords 工数情報
 * @param startDate 週報出力対象の開始日
 * @returns 日別業務状況
 */
const formatDailyWorkStatus = (
  workRecords: Effort[],
  startDate: Date,
): string => {
  const dailyHours: { [key: string]: number } = {};
  let totalHours = 0;

  for (const record of workRecords) {
    const date: string = dayjs(record.work_date).format('YYYY-MM-DD');
    dailyHours[date] = (dailyHours[date] || 0) + record.hours;
    totalHours += record.hours;
  }

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
  let dailyStatus = '<日別業務状況>\n';
  let workDayCount = 0;

  for (let i = 0; i < 5; i++) {
    const currentDate = dayjs(startDate).add(i, 'day');
    const dateKey = currentDate.format('YYYY-MM-DD');
    const dayOfWeek = weekDays[currentDate.day()];
    const hours = dailyHours[dateKey] || 0;
    if (hours > 0) {
      workDayCount++;
    }
    dailyStatus += `${currentDate.format('MM/DD')}(${dayOfWeek})：在宅 ${hours}h\n`;
  }

  const averageHours: number = workDayCount > 0 ? totalHours / workDayCount : 0;

  dailyStatus += `平均：${formatNumber(averageHours)}h/日\n`;
  dailyStatus += `合計：${formatNumber(totalHours)}h`;

  return dailyStatus;
};

/**
 * 案件別業務状況を返します
 * 例）
 * <案件別業務>
 * ■EntraID高速連携ツール（合計：34h）
 * >・打ち合わせ：5.75h
 * >・メール通知機能実装：18.5h
 * >・単体試験表作成：6.75h
 * >・単体試験：0.25h
 * >・検証：1h
 * >・インストーラー作成：0.5h
 * >・試験：1.25h
 *
 * @param workRecords 工数情報
 * @returns 案件別業務状況
 */
const formatProjectWorkStatus = (workRecords: Effort[]): string => {
  if (workRecords.length === 0) return '';

  const projectTasks: {
    [project: string]: {
      totalHours: number;
      tasks: { [task: string]: number };
    };
  } = {};

  for (const record of workRecords) {
    const projectName = record.tasks.projects.name;
    const taskName = record.tasks.name;
    if (!projectTasks[projectName]) {
      projectTasks[projectName] = { totalHours: 0, tasks: {} };
    }
    projectTasks[projectName].totalHours += record.hours;
    projectTasks[projectName].tasks[taskName] =
      (projectTasks[projectName].tasks[taskName] || 0) + record.hours;
  }

  let projectStatus = '<案件別業務状況>\n';
  const projectNames: string[] = Object.keys(projectTasks).sort((a, b) =>
    a.localeCompare(b),
  );

  for (const projectName of projectNames) {
    const projectData = projectTasks[projectName];
    projectStatus += `■${projectName}（合計：${formatNumber(projectData.totalHours, 2)}h）\n`;
    const taskNames: string[] = Object.keys(projectData.tasks).sort((a, b) =>
      a.localeCompare(b),
    );
    for (const taskName of taskNames) {
      const taskHours = projectData.tasks[taskName];
      projectStatus += `>・${taskName}：${formatNumber(taskHours, 2)}h\n`;
    }
    projectStatus += '\n';
  }

  return projectStatus.trim();
};

/**
 * 学習状況のフォーマットを返します
 * 値）
 * <学習状況(Udemy)>
 * ■
 * >進捗率：% (+%)
 *
 * @returns 学習状況のフォーマット
 */
const getLearnStatusFormat = (): string => {
  let learnStatus = '<学習状況(Udemy)>\n';
  learnStatus += '■\n';
  learnStatus += '>進捗率：% (+%)';
  return learnStatus;
};

/**
 * 目標進捗状況を返します
 * 例）
 * <目標進捗状況>
 * =============================
 * 全体
 * >進捗率：95.1%[285.2/300](+1.7%)
 * >加重達成率：89.6%[59.6,20,10](3.6%)
 * >期待値：96.1%(↓6.5%)
 * =============================
 * 
 * 
 * ■メイン：Udemyで20本のコースを受講し修了する[70]
 * >進捗率：85.2%(+5.2%)
 * 
 * ■サブ①：仕事サポートアプリの改修[20]
 * >進捗率：100%【達成】
 * 
 * ■サブ②：外部研修を5本受講する[10]
 * >進捗率：100%【達成】

 * @param goals 週報出力対象期間の目標情報
 * @param goalSummary 目標進捗サマリー
 * @returns 目標進捗状況
 */
const formatGoalStatus = (
  goals: GoalWithProgressDiff[],
  goalSummary: GoalSummary | null,
): string => {
  let goalStatus = '<目標進捗状況>\n';

  if (!goalSummary || goals.length === 0) {
    goalStatus += '検討中';
    return goalStatus.trim();
  }

  const isCompleted = goalSummary.simpleAverageProgress === 100;

  goalStatus += '=============================\n';
  goalStatus += `全体${isCompleted ? '【達成】' : ''}\n`;
  goalStatus += `>進捗率：${formatNumber(goalSummary.simpleAverageProgress)}%${getDiffFormat(goalSummary.simpleAverageProgressDiff)}\n`;
  goalStatus += `>加重達成率：${formatNumber(goalSummary.weightedAchievementRate)}%${getDiffFormat(goalSummary.weightedAchievementRateDiff)}\n`;
  goalStatus += `>期待値：${formatNumber(goalSummary.expectedValue)}%${getUpDownFormat(goalSummary.differenceFromExpected)}\n`;
  goalStatus += '=============================\n\n';

  for (const goal of goals.toSorted((a, b) => b.weight - a.weight)) {
    goalStatus += `■${goal.title}[${goal.weight}]\n`;
    goalStatus += `>進捗率：${goal.progress}%${getDiffFormat(goal.progressDiff)}`;
    if (goal.progress === 100) {
      goalStatus += '【達成】';
    }
    goalStatus += '\n\n';
  }

  return goalStatus.trim();
};

/**
 * 進捗を表すテキストを返します
 *
 * @param diff 差分（進捗）
 * @returns 進捗を表すテキスト
 */
const getDiffFormat = (diff: number): string => {
  if (diff > 0) {
    return `(+${formatNumber(diff)}%)`;
  }
  return '';
};

/**
 * 期待値との差分のテキストを返します
 * 例）↑5%
 *
 * @param differenceFromExpected 期待値との差分
 * @returns 期待値との差分のテキスト
 */
const getUpDownFormat = (differenceFromExpected: number): string => {
  const fixedValue: string = formatNumber(differenceFromExpected);
  if (differenceFromExpected < 0) {
    return `(↓${Math.abs(Number(fixedValue))}%)`;
  } else if (differenceFromExpected > 0) {
    return `(↑${fixedValue}%)`;
  } else {
    return `(→${fixedValue}%)`;
  }
};

/**
 * 整数であればそのまま文字列に変換し、小数なら1桁で丸めます
 *
 * @param value 対象の値
 * @param fractionDigits 小数点以下の桁数
 * @returns フォーマット化した文字列
 */
function formatNumber(value: number, fractionDigits: number = 1): string {
  return Number.isInteger(value)
    ? value.toString()
    : value.toFixed(fractionDigits);
}
