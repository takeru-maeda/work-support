import { z } from "zod";

import { UpdateMissionRequestSchema } from "../../../../../shared/src/schemas/missions";
import {
  getMissionService,
  upsertMissionService,
} from "../../missions/service";

import { runTool, toolResult } from "./context";

import type { ToolContext } from "./context";
import type { McpServer } from "@modelcontextprotocol/server";

/**
 * ミッションを読み書きするツールを登録します（AC-mcp-08、11）。
 *
 * @param server MCP サーバー
 * @param ctx ツールのコンテキスト
 */
export const registerMissionTools = (
  server: McpServer,
  ctx: ToolContext,
): void => {
  server.registerTool(
    "get_mission",
    {
      title: "ミッションを取得",
      description: "週報に載せるミッションの本文を返します（無ければ空）。",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true },
    },
    async () =>
      runTool(ctx, async () => {
        const mission = await getMissionService(ctx.supabase, ctx.user.id);
        const content: string = mission?.content ?? "";
        return toolResult(content || "ミッションはまだありません。", {
          content,
        });
      }),
  );

  server.registerTool(
    "update_mission",
    {
      title: "ミッションを更新",
      description:
        "ミッションの本文を、渡した内容で置き換えます（今の本文は残りません）。書き換える前に get_mission で今の本文を確かめ、利用者に変更の内容を確かめてから呼んでください。",
      inputSchema: z.object({
        // API は空白だけも受け付けるが、AI が誤って空で上書きしないように、ここでは拒む
        content: UpdateMissionRequestSchema.shape.content
          .refine((value) => value.trim() !== "", {
            message: "ミッションの本文を入力してください。",
          })
          .describe("新しいミッションの本文"),
      }),
      annotations: { readOnlyHint: false, idempotentHint: true },
    },
    async ({ content }) =>
      runTool(ctx, async () => {
        const mission = await upsertMissionService(
          ctx.supabase,
          ctx.user.id,
          content,
        );
        const saved: string = mission.content ?? "";
        return toolResult(`ミッションを更新しました。\n${saved}`, {
          content: saved,
        });
      }),
  );
};
