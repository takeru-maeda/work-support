import { z } from "zod";

import { listProjectNamesService } from "../../projects/service";

import { runTool, toolResult } from "./context";

import type { ToolContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/server";

/**
 * 案件とタスクの名前を読むツールを登録します（AC-mcp-06）。
 *
 * @param server MCP サーバー
 * @param ctx ツールのコンテキスト
 */
export const registerProjectTools = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "list_projects",
    {
      title: "案件とタスクの一覧",
      description:
        "登録されている案件と、その中のタスクの名前を返します。工数の登録（log_effort）や検索（search_work_records）で、既存の名前に合わせるのに使います。",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(ctx, async () => {
        const projects = await listProjectNamesService(
          ctx.supabase,
          ctx.user.id,
        );
        const text: string =
          projects.length === 0
            ? "案件はまだありません。"
            : projects
                .map(
                  (p) =>
                    `■${p.name}\n${p.tasks.map((t) => `・${t}`).join("\n")}`,
                )
                .join("\n\n");
        return toolResult(text, { projects });
      }),
  );
};
