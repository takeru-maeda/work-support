import { z } from "zod";

import {
  getWeeklyReportDetailService,
  searchWorkRecordsByNameService,
} from "../../reports/service";

import { runTool, todayInJst, toolResult } from "./context";

import type { ToolContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/server";

/**
 * 週報と工数を読むツールを登録します（AC-mcp-04、05）。
 *
 * @param server MCP サーバー
 * @param ctx ツールのコンテキスト
 */
export const registerReportTools = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "get_weekly_report",
    {
      title: "週報を取得",
      description:
        "指定した日を含む週（月曜〜日曜）の週報を返します。本文は Work Support の週報の画面と同じで、ほかに案件・タスクごとの工数のまとめと、目標の進捗を値で返します。",
      inputSchema: z.object({
        date: z.iso
          .date()
          .optional()
          .describe("週に含まれる日（YYYY-MM-DD）。省略すると日本時間の今日"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ date }) =>
      runTool(ctx, async () => {
        const target: string = date ?? todayInJst();
        const { weeklyReport, ...detail } = await getWeeklyReportDetailService(
          ctx.supabase,
          ctx.user.id,
          new Date(target),
        );
        return toolResult(weeklyReport, { ...detail });
      }),
  );

  server.registerTool(
    "search_work_records",
    {
      title: "工数を検索",
      description:
        "期間の工数の行（日付、案件名、タスク名、見積、実績）を日付の順に返します。案件名・タスク名は大文字小文字を区別した完全一致で絞ります（名前は list_projects で確かめられます）。行は 500 行までで、超えたら truncated が true になります。件数と合計は、当たったすべての行で数えます。",
      inputSchema: z.object({
        startDate: z.iso.date().describe("開始日（YYYY-MM-DD。この日を含む）"),
        endDate: z.iso
          .date()
          .describe(
            "終了日（YYYY-MM-DD。この日を含む。開始日から 366 日まで）",
          ),
        projectName: z.string().optional().describe("案件名（完全一致）"),
        taskName: z
          .string()
          .optional()
          .describe(
            "タスク名（完全一致。案件名を省くと、すべての案件から探す）",
          ),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) =>
      runTool(ctx, async () => {
        const result = await searchWorkRecordsByNameService(
          ctx.supabase,
          ctx.user.id,
          args,
        );
        const lines: string[] = result.records.map(
          (r) =>
            `${r.date} ${r.projectName} / ${r.taskName}：実績 ${r.hours}h（見積 ${r.estimatedHours ?? "-"}h）`,
        );
        const summary = `${result.count} 件、実績の合計 ${result.totalHours}h、見積の合計 ${result.totalEstimatedHours}h${result.truncated ? "（行は最初の 500 行だけ）" : ""}`;
        return toolResult([summary, ...lines].join("\n"), { ...result });
      }),
  );
};
