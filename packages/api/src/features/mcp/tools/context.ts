import { AppError } from "../../../lib/errors";

import type { Database } from "../../../../../shared/src/types/db";
import type { AuthenticatedUser, HonoEnv } from "../../../customTypes";
import type { Logger } from "../../../lib/logger";
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** ツールが使う、リクエストごとの値 */
export interface ToolContext {
  supabase: SupabaseClient<Database>;
  /** トークンのユーザー。ツールはこのユーザーのデータだけを読み書きする */
  user: AuthenticatedUser;
  env: HonoEnv["Bindings"];
  logger: Logger;
  accessLogId: number;
  /** 応答のあとに続ける処理（完了メールなど） */
  waitUntil: (promise: Promise<unknown>) => void;
}

/** 想定外の誤りのときに返す文 */
export const UNEXPECTED_ERROR_MESSAGE =
  "処理に失敗しました。時間を空けて再度お試しください。";

/**
 * 各機能の service が英語で返す誤りの文を、利用者に見せる日本語に直す対応表。
 * ツールの前の確認で起きないはずだが、確認と更新の間に消された場合などに備える
 */
const JAPANESE_MESSAGES: Record<string, string> = {
  "Goal not found for the given user and id": "目標が見つかりません。",
};

/**
 * 人が読める本文と、構造化した値の両方を持つ、ツールの成功の結果を作ります。
 *
 * @param text 本文
 * @param structuredContent 構造化した値
 * @returns ツールの結果
 */
export const toolResult = (
  text: string,
  structuredContent: Record<string, unknown>,
): CallToolResult => ({
  content: [{ type: "text", text }],
  structuredContent,
});

/**
 * ツールの誤りの結果を作ります（HTTP は 200 のまま、`isError: true` と文で返す）。
 *
 * @param message 利用者に見せる文
 * @returns ツールの結果
 */
export const toolError = (message: string): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

/**
 * ツールの処理を実行し、誤りをツールの誤りの結果に直します（AC-mcp-13）。
 * 業務の誤り（AppError の 4xx）はその文を返し、想定外の誤りは決まった文を返して error_logs に残す。
 *
 * @param ctx ツールのコンテキスト
 * @param run ツールの処理
 * @returns ツールの結果
 */
export const runTool = async (
  ctx: ToolContext,
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof AppError && error.statusCode < 500) {
      return toolError(JAPANESE_MESSAGES[error.message] ?? error.message);
    }
    const cause = error instanceof Error ? error : new Error(String(error));
    const detail =
      error instanceof AppError && error.internalError
        ? `${cause.message}: ${error.internalError.message}`
        : cause.message;
    await ctx.logger
      .error(`MCP tool failed: ${detail}`, { stackTrace: cause.stack ?? null })
      .catch(() => {});
    return toolError(UNEXPECTED_ERROR_MESSAGE);
  }
};

/**
 * 日本時間の今日の日付を返します（利用者は日本にいるので、日付を省いたときの「今日」はこれ）。
 *
 * @param now 今の時刻
 * @returns YYYY-MM-DD
 */
export const todayInJst = (now: Date = new Date()): string =>
  new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
