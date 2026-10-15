import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import { apiUrl, server } from "@/test/server";

import { reportUiError } from "./logs";

// 画面からのエラーの記録（docs/specs/platform/spec.md の AC-18）
let sent: Record<string, unknown>[];

beforeEach(() => {
  sent = [];
  server.use(
    http.post(apiUrl(API_ENDPOINTS.errorLogs), async ({ request }) => {
      sent.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json(
        { id: 1, recordedAt: "2026-10-13T00:00:00Z" },
        { status: 201 },
      );
    }),
  );
});

describe("reportUiError", () => {
  it("AC-platform-18: Error のメッセージとスタック、既定のレベル ERROR、UI、User-Agent、今の URL を送る", async () => {
    const error = new Error("壊れた");

    await expect(reportUiError(error)).resolves.toEqual({
      id: 1,
      recordedAt: "2026-10-13T00:00:00Z",
    });

    expect(sent).toEqual([
      expect.objectContaining({
        message: "壊れた",
        stackTrace: error.stack,
        level: "ERROR",
        source: "UI",
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
      }),
    ]);
  });

  it("AC-platform-18: 指定したメッセージ、レベル、追加の情報を優先する", async () => {
    await reportUiError(new Error("元の文"), {
      message: "指定の文",
      level: "WARNING",
      clientContext: { goalId: 1 },
    });

    expect(sent[0]).toMatchObject({
      message: "指定の文",
      level: "WARNING",
      clientContext: { goalId: 1 },
    });
  });

  it.each([
    ["オブジェクト", { code: 1 }, '{"code":1}'],
    ["null", null, "null"],
    ["undefined", undefined, "Unknown error"],
    ["文字列", "文字のエラー", "文字のエラー"],
    ["数値", 42, "42"],
  ])(
    "AC-platform-18: %s はメッセージを決まった形にする",
    async (_label, error, message) => {
      await reportUiError(error);

      expect(sent[0]).toMatchObject({ message, stackTrace: null });
    },
  );

  it("AC-platform-18: メッセージが空になると、送る前の検証で例外になり送らない", async () => {
    await expect(reportUiError(new Error(""))).rejects.toThrow();

    expect(sent).toEqual([]);
  });

  it("AC-platform-18: 送れなければ例外になる（既知の落とし穴。呼び出し側が受け止めないと未処理になる）", async () => {
    server.use(
      http.post(apiUrl(API_ENDPOINTS.errorLogs), () =>
        HttpResponse.json({ error: "Unauthorized" }, { status: 401 }),
      ),
    );

    await expect(reportUiError(new Error("x"))).rejects.toThrow();
  });
});
