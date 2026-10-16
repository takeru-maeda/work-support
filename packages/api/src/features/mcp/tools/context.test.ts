import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../../lib/errors";

import {
  runTool,
  todayInJst,
  toolResult,
  UNEXPECTED_ERROR_MESSAGE,
} from "./context";

import type { ToolContext } from "./context";
import type { Logger } from "../../../lib/logger";

/** 呼ばれた error を確かめられるロガーの偽物だけを持つコンテキスト */
const fakeContext = () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(async () => {}),
    critical: vi.fn(),
  } as unknown as Logger & { error: ReturnType<typeof vi.fn> };
  return { ctx: { logger } as unknown as ToolContext, logger };
};

describe("runTool（docs/specs/mcp/spec.md の AC-mcp-13）", () => {
  it("成功ならそのまま返す", async () => {
    const { ctx } = fakeContext();

    const result = await runTool(ctx, async () => toolResult("ok", { a: 1 }));

    expect(result).toEqual({
      content: [{ type: "text", text: "ok" }],
      structuredContent: { a: 1 },
    });
  });

  it("AppError の 4xx は、その文のツールの誤り。英語の決まった文は日本語に直す。error_logs には残さない", async () => {
    const { ctx, logger } = fakeContext();

    const business = await runTool(ctx, async () => {
      throw new AppError(400, "重みの合計を100%にしてください。");
    });
    const english = await runTool(ctx, async () => {
      throw new AppError(400, "Goal not found for the given user and id");
    });

    expect(business).toEqual({
      content: [{ type: "text", text: "重みの合計を100%にしてください。" }],
      isError: true,
    });
    expect(english.content).toEqual([
      { type: "text", text: "目標が見つかりません。" },
    ]);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it.each([
    ["AppError の 500", new AppError(500, "Failed to fetch goals")],
    ["想定外の例外", new TypeError("x is undefined")],
  ])("%s は決まった文を返し、error_logs に残す", async (_label, error) => {
    const { ctx, logger } = fakeContext();

    const result = await runTool(ctx, async () => {
      throw error;
    });

    expect(result).toEqual({
      content: [{ type: "text", text: UNEXPECTED_ERROR_MESSAGE }],
      isError: true,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining(error.message),
      expect.objectContaining({ stackTrace: expect.any(String) }),
    );
  });
});

describe("todayInJst", () => {
  it.each([
    ["2026-10-11T14:59:59Z", "2026-10-11"],
    ["2026-10-11T15:00:00Z", "2026-10-12"],
    ["2026-12-31T15:00:00Z", "2027-01-01"],
  ])("%s は日本時間で %s", (now, expected) => {
    expect(todayInJst(new Date(now))).toBe(expected);
  });
});
