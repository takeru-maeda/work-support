import { z } from "zod";

import {
  CreateGoalPeriodRequestSchema,
  MAX_GOALS_PER_PERIOD,
  UpdateGoalRequestSchema,
} from "../../../../../shared/src/schemas/goals";
import {
  createGoalPeriodService,
  getGoalsOverviewService,
  updateCurrentGoalProgressService,
  validateGoalPeriod,
} from "../../goals/service";
import { createConfirmToken } from "../confirmToken";

import { runTool, todayInJst, toolError, toolResult } from "./context";

import type { ToolContext } from "./context";
import type { GoalPeriodCreateRequest } from "../../../../../shared/src/schemas/goals";
import type { Tables } from "../../../../../shared/src/types/db";
import type { McpServer } from "@modelcontextprotocol/server";

/** confirmToken がプレビューと合わないときの文 */
export const CONFIRM_TOKEN_MISMATCH_MESSAGE =
  "プレビューのあとに内容か状況が変わりました。もう一度プレビューしてください。";

const slashDate = (date: string): string => date.replaceAll("-", "/");

/**
 * 期間を作ると何が起きるかを、利用者に伝える文にします（AC-mcp-12）。
 *
 * @param lockedGoals この期間で編集できなくなる今の目標
 * @returns 警告の文
 */
export const goalPeriodWarning = (lockedGoals: Tables<"goals">[]): string => {
  if (lockedGoals.length === 0) return "期間はあとから変えられません。";
  const start: string = lockedGoals.map((goal) => goal.start_date).sort()[0];
  const end: string = lockedGoals[0].end_date;
  return `この期間を作ると、今の期間（${slashDate(start)}〜${slashDate(end)}）の目標 ${lockedGoals.length} 件は過去の目標になり、編集できなくなります。期間はあとから変えられません。`;
};

const goalSummaryOf = (goal: Tables<"goals">) => ({
  id: goal.id,
  title: goal.title,
  weight: goal.weight,
  progress: goal.progress,
  startDate: goal.start_date,
  endDate: goal.end_date,
});

/**
 * 目標を読み書きするツールを登録します（AC-mcp-07、10、12）。
 *
 * @param server MCP サーバー
 * @param ctx ツールのコンテキスト
 */
export const registerGoalTools = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "get_goals",
    {
      title: "目標を取得",
      description:
        "現在の期間の目標（ID、名前、内容、重み、進捗率、前週からの差）と、全体進捗（単純平均）と加重進捗を返します。includePast を true にすると、過去の目標も期間ごとに返します。",
      inputSchema: z.object({
        includePast: z
          .boolean()
          .optional()
          .describe("過去の期間の目標も返すか（既定は false）"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ includePast }) =>
      runTool(ctx, async () => {
        const overview = await getGoalsOverviewService(
          ctx.supabase,
          ctx.user.id,
          todayInJst(),
          includePast ?? false,
        );
        const text: string = overview.period
          ? [
              `現在の期間: ${overview.period.startDate}〜${overview.period.endDate}`,
              `全体進捗 ${overview.summary?.simpleAverageProgress ?? 0}%、加重進捗 ${overview.summary?.weightedAchievementRate ?? 0}%`,
              ...overview.goals.map(
                (g) =>
                  `■[${g.id}] ${g.title}（重み ${g.weight}）：進捗 ${g.progress}%（前週から ${g.progressDiff >= 0 ? "+" : ""}${g.progressDiff}%）`,
              ),
            ].join("\n")
          : "目標はまだありません。";
        return toolResult(text, { ...overview });
      }),
  );

  server.registerTool(
    "update_goal_progress",
    {
      title: "目標の進捗率を更新",
      description:
        "現在の期間の目標の進捗率を変え、進捗の履歴を残します（週報の前週からの差に使われます）。目標の ID は get_goals で確かめてください。過去の期間の目標は変えられません。",
      inputSchema: z.object({
        goalId: z.number().int().describe("目標の ID（get_goals の id）"),
        progress: UpdateGoalRequestSchema.shape.progress
          .unwrap()
          .describe("新しい進捗率（0〜100。小数第 2 位まで）"),
      }),
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ goalId, progress }) =>
      runTool(ctx, async () => {
        const goal = await updateCurrentGoalProgressService(
          ctx.supabase,
          ctx.user.id,
          goalId,
          progress,
        );
        return toolResult(
          `「${goal.title}」の進捗率を ${goal.progress}% にしました。`,
          goalSummaryOf(goal),
        );
      }),
  );

  server.registerTool(
    "create_goal_period",
    {
      title: "目標の期間を作る",
      description: [
        "新しい目標の期間を、すべての目標とともに作ります。必ず 2 回に分けて呼んでください。",
        "1 回目は confirmToken を付けずに呼びます。何も保存せず、誤り（errors）、編集できなくなる今の目標（lockedGoals）、利用者に伝える警告（warning）、誤りが無ければ confirmToken を返します。",
        "warning を必ず利用者に見せ、同意を得てから、同じ内容に confirmToken を付けて 2 回目を呼ぶと作ります。",
        "期間を作ると、今の期間の目標は過去の目標になって編集できなくなり、作った期間もあとから変えられません。",
        `目標は ${MAX_GOALS_PER_PERIOD} 件まで、重みの合計はちょうど 100 にします。`,
      ].join(""),
      inputSchema: z.object({
        startDate: CreateGoalPeriodRequestSchema.shape.start_date.describe(
          "開始日（YYYY-MM-DD。今の期間の終了日より後）",
        ),
        endDate: CreateGoalPeriodRequestSchema.shape.end_date.describe(
          "終了日（YYYY-MM-DD。開始日より後）",
        ),
        goals: CreateGoalPeriodRequestSchema.shape.goals.describe(
          "目標（title、content、weight。weight の合計は 100）",
        ),
        confirmToken: z
          .string()
          .optional()
          .describe("1 回目の結果の confirmToken。付けると期間を作る"),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async ({ startDate, endDate, goals, confirmToken }) =>
      runTool(ctx, async () => {
        const period: GoalPeriodCreateRequest = {
          start_date: startDate,
          end_date: endDate,
          goals,
        };
        const { errors, lockedGoals } = await validateGoalPeriod(
          ctx.supabase,
          ctx.user.id,
          period,
        );

        if (confirmToken === undefined) {
          const warning: string = goalPeriodWarning(lockedGoals);
          const token =
            errors.length === 0
              ? {
                  confirmToken: await createConfirmToken(
                    ctx.user.id,
                    period,
                    lockedGoals,
                  ),
                }
              : {};
          const text: string =
            errors.length > 0
              ? `この内容では作れません。\n${errors.join("\n")}`
              : `${warning}\n利用者の同意を得てから、confirmToken を付けて呼んでください。`;
          return toolResult(text, {
            errors,
            period: { startDate, endDate },
            goals,
            lockedGoals: lockedGoals.map(goalSummaryOf),
            warning,
            ...token,
          });
        }

        if (errors.length > 0) return toolError(errors.join("\n"));
        const expected: string = await createConfirmToken(
          ctx.user.id,
          period,
          lockedGoals,
        );
        if (expected !== confirmToken) {
          return toolError(CONFIRM_TOKEN_MISMATCH_MESSAGE);
        }

        const created = await createGoalPeriodService(
          ctx.supabase,
          ctx.user.id,
          period,
        );
        return toolResult(
          `${startDate}〜${endDate} の目標を ${created.length} 件作りました。`,
          { created: created.map(goalSummaryOf) },
        );
      }),
  );
};
