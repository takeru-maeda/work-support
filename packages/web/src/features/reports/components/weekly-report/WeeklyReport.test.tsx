import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import { showErrorToast } from "@/lib/toast";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";

import { WeeklyReport } from ".";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

interface ApiLog {
  dates: (string | null)[];
  errorLogs: unknown[];
}

/** 週報の API。`respond` が null なら 500 を返す */
const mockApi = (
  respond: ((date: string | null) => string) | null = (date) => `週報 ${date}`,
  delay?: Promise<void>,
): ApiLog => {
  const log: ApiLog = { dates: [], errorLogs: [] };
  server.use(
    http.get(apiUrl(API_ENDPOINTS.weeklyReport), async ({ request }) => {
      const date = new URL(request.url).searchParams.get("date");
      log.dates.push(date);
      await delay;
      if (!respond) return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ weeklyReport: respond(date) });
    }),
    http.post(apiUrl(API_ENDPOINTS.errorLogs), async ({ request }) => {
      log.errorLogs.push(await request.json());
      return HttpResponse.json(
        { id: 1, recordedAt: "2026-10-14T00:00:00Z" },
        { status: 201 },
      );
    }),
  );
  return log;
};

const outputButton = () => screen.getByRole("button", { name: /出力/ });

beforeEach(() => {
  signInTestUser();
  vi.mocked(showErrorToast).mockClear();
  // 端末の今日を 2026-10-14（水）に固定する。タイマーは本物のまま
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WeeklyReport（週報出力）", () => {
  it("AC-weekly-report-11: 最初は端末の今日を含む週（月曜〜日曜）を出し、出力はしない", async () => {
    const log = mockApi();
    renderWithProviders(<WeeklyReport />);

    expect(
      screen.getByRole("button", { name: "2026/10/12 - 2026/10/18" }),
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(log.dates).toEqual([]);
  });

  it("AC-weekly-report-11: 日付を選ぶと週の表示が変わるが、出力はしない", async () => {
    const log = mockApi();
    const ui = userEvent.setup();
    renderWithProviders(<WeeklyReport />);

    await ui.click(
      screen.getByRole("button", { name: "2026/10/12 - 2026/10/18" }),
    );
    await ui.click(await screen.findByRole("button", { name: /October 20/ }));

    expect(
      await screen.findByRole("button", { name: "2026/10/19 - 2026/10/25" }),
    ).toBeInTheDocument();
    expect(log.dates).toEqual([]);
  });

  it("AC-weekly-report-12: 「出力」で選んだ日付の週報を取り、本文を出す。待っている間は「出力中...」で押せない", async () => {
    let release!: () => void;
    const delay = new Promise<void>((resolve) => {
      release = resolve;
    });
    const log = mockApi((date) => `<日別業務状況>\n${date}`, delay);
    const ui = userEvent.setup();
    renderWithProviders(<WeeklyReport />);

    await ui.click(outputButton());

    expect(
      await screen.findByRole("button", { name: /出力中\.\.\./ }),
    ).toBeDisabled();
    release();
    expect(await screen.findByText(/<日別業務状況>/)).toHaveTextContent(
      "<日別業務状況> 2026-10-14",
    );
    expect(log.dates).toEqual(["2026-10-14"]);
    expect(outputButton()).toBeEnabled();
  });

  it("AC-weekly-report-12: 失敗したら表示中の本文を消し、エラーの文を出して error_logs に送る（トーストは出さない）", async () => {
    mockApi();
    const ui = userEvent.setup();
    renderWithProviders(<WeeklyReport />);
    await ui.click(outputButton());
    expect(await screen.findByText("週報 2026-10-14")).toBeInTheDocument();

    const log = mockApi(null);
    await ui.click(outputButton());

    expect(
      await screen.findByText(
        "週報の取得に失敗しました: Request failed with status code 500",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("週報 2026-10-14")).not.toBeInTheDocument();
    await waitFor(() => expect(log.errorLogs).toHaveLength(1));
    expect(showErrorToast).not.toHaveBeenCalled();
  });

  it("AC-weekly-report-13: 「コピー」で本文をクリップボードに入れ、2 秒間「コピー済み」にする", async () => {
    mockApi(() => "週報の本文");
    const ui = userEvent.setup();
    renderWithProviders(<WeeklyReport />);
    await ui.click(outputButton());
    await screen.findByText("週報の本文");

    await ui.click(screen.getByRole("button", { name: "コピー" }));

    expect(await navigator.clipboard.readText()).toBe("週報の本文");
    expect(
      screen.getByRole("button", { name: "コピー済み" }),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: "コピー" }),
        ).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it("AC-weekly-report-13: クリップボードに入れられなければ、利用者には知らせず error_logs に送る", async () => {
    const log = mockApi(() => "週報の本文");
    const ui = userEvent.setup();
    renderWithProviders(<WeeklyReport />);
    await ui.click(outputButton());
    await screen.findByText("週報の本文");
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );

    await ui.click(screen.getByRole("button", { name: "コピー" }));

    await waitFor(() => expect(log.errorLogs).toHaveLength(1));
    expect(screen.getByRole("button", { name: "コピー" })).toBeInTheDocument();
    expect(showErrorToast).not.toHaveBeenCalled();
  });
});
