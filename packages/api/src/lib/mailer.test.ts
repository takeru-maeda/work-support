import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "./errors";
import { sendEffortCompletionEmail } from "./mailer";

import type { HonoEnv } from "../custom-types";

// メールの依頼（docs/specs/platform/spec.md の AC-19）。GAS の宛先への fetch を差し替える
const env = {
  GAS_EMAIL_ENDPOINT: "http://gas.test/send",
  API_KEY: "test-api-key",
} as HonoEnv["Bindings"];

const options = {
  to: "user@example.test",
  subject: "件名",
  body: "本文",
  accessLogId: 7,
};

const respond = (status: number, body: unknown) =>
  vi.fn(
    async () =>
      new Response(typeof body === "string" ? body : JSON.stringify(body), {
        status,
      }),
  );

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("失敗しなかった");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendEffortCompletionEmail", () => {
  it("AC-platform-19: GAS の宛先に { to, subject, body, apikey } を POST する", async () => {
    const fetchMock = respond(200, {
      success: true,
      status: 200,
      message: "ok",
    });
    vi.stubGlobal("fetch", fetchMock);

    await sendEffortCompletionEmail(env, options);

    expect(fetchMock).toHaveBeenCalledWith("http://gas.test/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "user@example.test",
        subject: "件名",
        body: "本文",
        apikey: "test-api-key",
      }),
    });
  });

  it("AC-platform-19: 2xx で本文の形が合わないときは成功として扱う", async () => {
    vi.stubGlobal("fetch", respond(200, { unexpected: true }));

    await expect(
      sendEffortCompletionEmail(env, options),
    ).resolves.toBeUndefined();
  });

  it.each([
    [
      "通信の失敗",
      vi.fn(async () => {
        throw new Error("network down");
      }),
      "Failed to call mail API (accessLogId=7): network down",
    ],
    [
      "HTTP のエラー",
      respond(503, { success: false, status: 503, message: "busy" }),
      "Mail API responded with error (accessLogId=7): busy",
    ],
    [
      "HTTP のエラーで本文の形が違う",
      respond(500, { other: 1 }),
      "Mail API responded with error (accessLogId=7): status=500",
    ],
    [
      "success: false",
      respond(200, { success: false, status: 400, message: "bad address" }),
      "Mail API reported failure (accessLogId=7): bad address",
    ],
  ])(
    "AC-platform-19: %s なら AppError 500",
    async (_label, fetchMock, message) => {
      vi.stubGlobal("fetch", fetchMock);

      const error = await errorOf(sendEffortCompletionEmail(env, options));

      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).statusCode).toBe(500);
      expect((error as AppError).message).toBe(message);
    },
  );

  it("AC-platform-19: JSON でない応答は AppError ではない例外になる（既知の落とし穴。P6 で扱う）", async () => {
    vi.stubGlobal("fetch", respond(200, "<html>エラー</html>"));

    const error = await errorOf(sendEffortCompletionEmail(env, options));

    expect(error).not.toBeInstanceOf(AppError);
  });

  it("AC-platform-19: 送り先の形が違うと送らずに例外", async () => {
    const fetchMock = respond(200, {
      success: true,
      status: 200,
      message: "ok",
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendEffortCompletionEmail(env, { ...options, to: "not-an-email" }),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
