import { McpServer } from "@modelcontextprotocol/server";

import { registerEffortTools } from "./tools/effort";
import { registerGoalTools } from "./tools/goals";
import { registerMissionTools } from "./tools/missions";
import { registerProjectTools } from "./tools/projects";
import { registerReportTools } from "./tools/reports";

import type { ToolContext } from "./tools/context";

/**
 * リクエストごとの MCP サーバーを作り、ツールを登録します。
 * ツールは HTTP を通らずに各機能の service を呼び、入出力の変換だけを行う（INV-mcp-1）。
 * 取り消せない操作（アカウントの削除、目標の削除）はツールにしない（INV-mcp-3）。
 *
 * @param ctx トークンのユーザーと、ツールが使う値
 * @returns MCP サーバー
 */
export const createMcpServer = (ctx: ToolContext): McpServer => {
  const server = new McpServer(
    { name: "work-support", version: "1.2.0" },
    {
      instructions:
        "Work Support（個人の工数・目標・週報・ミッションの管理）のツールです。名前の表記は list_projects や get_goals で確かめてから使ってください。書き込むツールは、利用者に内容を確かめてから呼んでください。",
    },
  );
  registerReportTools(server, ctx);
  registerProjectTools(server, ctx);
  registerGoalTools(server, ctx);
  registerMissionTools(server, ctx);
  registerEffortTools(server, ctx);
  return server;
};
