import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import { showErrorToast } from "@/lib/toast";
import { useUserSettingsStore } from "@/store/userSettings";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";

import SettingsPage from "./SettingsPage";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

const settingsOf = (notify: boolean) => ({
  id: 1,
  notify_effort_email: notify,
  updated_at: "2026-10-13T00:00:00Z",
});

interface ApiOptions {
  put?: "ok" | "error";
  putDelay?: Promise<void>;
}

const mockApi = ({ put = "ok", putDelay }: ApiOptions = {}) => {
  const log = { puts: [] as unknown[], errorLogs: 0 };
  server.use(
    http.put(apiUrl(API_ENDPOINTS.userSettings), async ({ request }) => {
      const body = (await request.json()) as { notifyEffortEmail: boolean };
      log.puts.push(body);
      await putDelay;
      if (put === "error") return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({
        user_settings: settingsOf(body.notifyEffortEmail),
      });
    }),
    http.get(apiUrl(API_ENDPOINTS.userSettings), () =>
      HttpResponse.json({ user_settings: settingsOf(true) }),
    ),
    http.post(apiUrl(API_ENDPOINTS.errorLogs), () => {
      log.errorLogs += 1;
      return HttpResponse.json(
        { id: 1, recordedAt: "2026-10-13T00:00:00Z" },
        { status: 201 },
      );
    }),
  );
  return log;
};

const toggle = () =>
  screen.getByRole("switch", { name: "工数登録時のメール通知" });

beforeEach(() => {
  signInTestUser();
  useUserSettingsStore.getState().clearSettings();
  vi.mocked(showErrorToast).mockClear();
});

describe("SettingsPage（設定）", () => {
  it("AC-user-settings-06: 「通知設定」のカードに、ストアの値のスイッチと説明を出す", async () => {
    mockApi();
    useUserSettingsStore.getState().setSettings(settingsOf(false));
    renderWithProviders(<SettingsPage />);

    expect(screen.getByText("通知設定")).toBeInTheDocument();
    expect(
      screen.getByText("工数登録時、登録内容をメールで通知します"),
    ).toBeInTheDocument();
    expect(toggle()).not.toBeChecked();
    expect(toggle()).toBeEnabled();
  });

  it("AC-user-settings-06: 初期化が済むまでは、オンの表示のまま押せない", async () => {
    mockApi();
    renderWithProviders(<SettingsPage />);

    expect(toggle()).toBeChecked();
    expect(toggle()).toBeDisabled();
    expect(
      screen.queryByText(/設定の取得に失敗しました/),
    ).not.toBeInTheDocument();
  });

  it("AC-user-settings-06: 初期化が済んで設定が無ければ、エラーの文を出して押せない", async () => {
    mockApi();
    useUserSettingsStore.getState().markInitialized();
    renderWithProviders(<SettingsPage />);

    expect(
      await screen.findByText(
        "設定の取得に失敗しました。時間を空けて再度お試しください。",
      ),
    ).toBeInTheDocument();
    expect(toggle()).toBeDisabled();
  });

  it("AC-user-settings-07: 押すとすぐ表示を切り替え、保存中は押せず、成功したらストアを更新する", async () => {
    let release!: () => void;
    const putDelay = new Promise<void>((resolve) => {
      release = resolve;
    });
    const log = mockApi({ putDelay });
    useUserSettingsStore.getState().setSettings(settingsOf(true));
    const ui = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await ui.click(toggle());

    expect(toggle()).not.toBeChecked();
    expect(toggle()).toBeDisabled();
    release();
    await waitFor(() => expect(toggle()).toBeEnabled());
    expect(log.puts).toEqual([{ notifyEffortEmail: false }]);
    expect(useUserSettingsStore.getState().settings?.notify_effort_email).toBe(
      false,
    );
  });

  it("AC-user-settings-07: 失敗したら表示を戻し、エラーの文を出して error_logs に送る（トーストは出さない）", async () => {
    const log = mockApi({ put: "error" });
    useUserSettingsStore.getState().setSettings(settingsOf(true));
    const ui = userEvent.setup();
    renderWithProviders(<SettingsPage />);

    await ui.click(toggle());

    expect(
      await screen.findByText(
        "設定の更新に失敗しました。時間を空けて再度お試しください。",
      ),
    ).toBeInTheDocument();
    expect(toggle()).toBeChecked();
    await waitFor(() => expect(log.errorLogs).toBe(1));
    expect(showErrorToast).not.toHaveBeenCalled();
    expect(useUserSettingsStore.getState().settings?.notify_effort_email).toBe(
      true,
    );
  });
});
