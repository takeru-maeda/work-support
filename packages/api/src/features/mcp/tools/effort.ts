import { z } from "zod";

import {
  saveStructuredEffortEntries,
  sendEffortCompletionEmailIfNeeded,
} from "../../effort/service";

import { runTool, toolResult } from "./context";

import type { ToolContext } from "./context";
import type { EffortEntriesRequest } from "../../../../../shared/src/schemas/effort";
import type { McpServer } from "@modelcontextprotocol/server";

/**
 * 工数を登録するツールを登録します（AC-mcp-09）。
 *
 * @param server MCP サーバー
 * @param ctx ツールのコンテキスト
 */
export const registerEffortTools = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "log_effort",
    {
      title: "工数を登録",
      description:
        "1 日分の工数を登録します。案件名・タスク名が無ければ新しく作ります（既存の名前は list_projects で確かめ、表記を合わせてください。大文字小文字も区別します）。全部保存するか、何も保存しないかのどちらかです。登録すると、設定に応じて完了メールが届きます。失敗したときは、search_work_records で保存されていないことを確かめてから送り直してください（同じ内容を 2 回送ると 2 重に登録されます）。",
      inputSchema: z.object({
        date: z.iso.date().describe("作業日（YYYY-MM-DD）"),
        entries: z
          .array(
            z.object({
              projectName: z.string().describe("案件名"),
              taskName: z.string().describe("タスク名"),
              estimatedHours: z
                .number()
                .nullable()
                .optional()
                .describe("見積の時間（0 以上 100 未満。小数第 2 位まで）"),
              hours: z
                .number()
                .describe("実績の時間（0 以上 100 未満。小数第 2 位まで）"),
            }),
          )
          .min(1)
          .describe("登録する行"),
        memo: z.string().optional().describe("完了メールに載せるメモ"),
      }),
      annotations: { readOnlyHint: false, idempotentHint: false },
    },
    async ({ date, entries, memo }) =>
      runTool(ctx, async () => {
        const payload: EffortEntriesRequest = {
          date,
          entries: entries.map((entry) => ({
            project_id: null,
            project_name: entry.projectName,
            task_id: null,
            task_name: entry.taskName,
            estimated_hours: entry.estimatedHours ?? null,
            hours: entry.hours,
          })),
          memo: memo ?? null,
        };
        const result = await saveStructuredEffortEntries(
          ctx.supabase,
          ctx.user.id,
          payload,
          ctx.logger,
        );
        // 完了メールは、画面の登録と同じ条件と関数で、応答のあとに送る
        ctx.waitUntil(
          sendEffortCompletionEmailIfNeeded(
            ctx.supabase,
            ctx.env,
            ctx.user,
            result,
            ctx.logger,
            ctx.accessLogId,
            payload.memo ?? null,
          ),
        );

        const saved = result.savedRecords.map((item) => ({
          projectName: item.project.name,
          taskName: item.task.name,
          estimatedHours: item.record.estimated_hours,
          hours: item.record.hours,
        }));
        const lines: string[] = [
          `${date} の工数を ${saved.length} 行登録しました。`,
          ...saved.map(
            (s) =>
              `・${s.projectName} / ${s.taskName}：実績 ${s.hours}h（見積 ${s.estimatedHours ?? "-"}h）`,
          ),
          ...result.createdProjects.map((name) => `新しい案件: ${name}`),
          ...result.createdTasks.map(
            (t) => `新しいタスク: ${t.projectName} / ${t.taskName}`,
          ),
        ];
        return toolResult(lines.join("\n"), {
          date,
          saved,
          createdProjects: result.createdProjects,
          createdTasks: result.createdTasks,
        });
      }),
  );
};
