import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import { getCurrentUser } from "@/lib/auth";
import type * as Auth from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useUserStore } from "@/store/user";
import { useUserSettingsStore } from "@/store/userSettings";
import { renderWithProviders } from "@/test/render";
import { apiUrl, server } from "@/test/server";

import App from "./App";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof Auth>()),
  getAccessToken: async () => null,
  getCurrentUser: vi.fn(),
}));

const USER: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "テスト ユーザー",
  email: "test@example.com",
};

const settingsOf = (notify: boolean) => ({
  id: 1,
  notify_effort_email: notify,
  updated_at: "2026-10-13T00:00:00Z",
});

/** 今のパスを画面に出す（移ったかを確かめるため） */
const LocationProbe = () => {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
};

interface ApiOptions {
  /** GET /api/user-settings の応答。null なら 404 */
  settings?: boolean | null | "error";
}

const mockApi = ({ settings = true }: ApiOptions = {}) => {
  const log = { gets: 0, posts: 0, errorLogs: 0 };
  server.use(
    http.get(apiUrl(API_ENDPOINTS.userSettings), () => {
      log.gets += 1;
      if (settings === "error") return new HttpResponse(null, { status: 500 });
      if (settings === null) {
        return HttpResponse.json(
          { error: "User settings not found", accessLogId: 1 },
          { status: 404 },
        );
      }
      return HttpResponse.json({ user_settings: settingsOf(settings) });
    }),
    http.post(apiUrl(API_ENDPOINTS.userSettings), () => {
      log.posts += 1;
      return HttpResponse.json(
        { user_settings: settingsOf(true) },
        { status: 201 },
      );
    }),
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

const renderAt = (path: string) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>,
  );

const location = () => screen.getByTestId("location").textContent;

beforeEach(() => {
  useUserStore.getState().clearUser();
  useUserSettingsStore.getState().clearSettings();
  vi.mocked(getCurrentUser).mockReset();
});

describe("ルートと保護（App）", () => {
  it.each(["/landing", "/login", "/signup", "/reset-password"])(
    "AC-auth-01: %s はログインなしで開ける",
    async (path) => {
      mockApi();
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      renderAt(path);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(location()).toBe(path);
      expect(getCurrentUser).not.toHaveBeenCalled();
    },
  );

  it.each(["/settings", "/goals", "/efforts/new", "/profile"])(
    "AC-auth-02: 未ログインで保護された画面 %s を開くと、ストアを空にして /landing に移る",
    async (path) => {
      mockApi();
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      useUserStore.getState().setUser(USER);
      useUserSettingsStore.getState().setSettings(settingsOf(true));
      renderAt(path);

      await waitFor(() => expect(location()).toBe("/landing"));
      expect(useUserStore.getState().user).toBeNull();
      expect(useUserSettingsStore.getState().settings).toBeNull();
    },
  );

  it("AC-auth-01 / AC-mcp-14: /oauth/consent は AuthGuard の外で、未ログインなら /landing ではなくログインへ移る", async () => {
    mockApi();
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
      data: { user: null },
      error: null,
    } as unknown as Awaited<ReturnType<typeof supabase.auth.getUser>>);
    renderAt("/oauth/consent?authorization_id=abc");

    await waitFor(() => expect(location()).toBe("/login"));
    expect(getCurrentUser).not.toHaveBeenCalled();
  });

  it("AC-auth-01: どれにも当たらないパスは、ログインしていても /landing に移る", async () => {
    mockApi();
    vi.mocked(getCurrentUser).mockResolvedValue(USER);
    renderAt("/no-such-page");

    await waitFor(() => expect(location()).toBe("/landing"));
  });

  it("AC-auth-03: ログインしたまま /login を開いても、そのまま表示する", async () => {
    mockApi();
    vi.mocked(getCurrentUser).mockResolvedValue(USER);
    useUserStore.getState().setUser(USER);
    renderAt("/login");

    expect(
      await screen.findByRole("button", { name: "ログイン" }),
    ).toBeInTheDocument();
    expect(location()).toBe("/login");
  });

  it("AC-auth-02 / AC-user-settings-05: ログインしていれば画面を出し、ユーザーと設定をストアに入れる", async () => {
    const log = mockApi({ settings: false });
    vi.mocked(getCurrentUser).mockResolvedValue(USER);
    renderAt("/settings");

    expect(await screen.findByText("通知設定")).toBeInTheDocument();
    expect(useUserStore.getState().user).toEqual(USER);
    expect(useUserSettingsStore.getState().settings).toMatchObject({
      notify_effort_email: false,
    });
    expect(log.posts).toBe(0);
  });

  it("AC-user-settings-05 / INV-1: 設定の行が無ければ（404）、作ってからストアに入れる", async () => {
    const log = mockApi({ settings: null });
    vi.mocked(getCurrentUser).mockResolvedValue(USER);
    renderAt("/settings");

    await screen.findByText("通知設定");
    await waitFor(() =>
      expect(useUserSettingsStore.getState().settings).toMatchObject({
        notify_effort_email: true,
      }),
    );
    expect(log.posts).toBe(1);
  });

  it("AC-user-settings-05: 設定の取得に失敗しても画面を出し、初期化済みにして error_logs に送る", async () => {
    const log = mockApi({ settings: "error" });
    vi.mocked(getCurrentUser).mockResolvedValue(USER);
    renderAt("/settings");

    expect(
      await screen.findByText(
        "設定の取得に失敗しました。時間を空けて再度お試しください。",
      ),
    ).toBeInTheDocument();
    expect(useUserSettingsStore.getState()).toMatchObject({
      settings: null,
      initialized: true,
    });
    await waitFor(() => expect(log.errorLogs).toBe(1));
  });

  it("AC-auth-02: 保護された画面のあいだを移るたびに、ユーザーの確かめと設定の取得をやり直す（既知の落とし穴）", async () => {
    const log = mockApi();
    server.use(
      http.get(apiUrl(API_ENDPOINTS.goalsCurrent), () =>
        HttpResponse.json({ goals: [] }),
      ),
      http.get(apiUrl(API_ENDPOINTS.goalsHistory), () =>
        HttpResponse.json({
          items: [],
          meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
          aggregations: { totalCount: 0 },
        }),
      ),
    );
    vi.mocked(getCurrentUser).mockResolvedValue(USER);
    const ui = userEvent.setup();
    renderAt("/settings");
    await screen.findByText("通知設定");
    const before = vi.mocked(getCurrentUser).mock.calls.length;

    await ui.click(screen.getAllByRole("link", { name: /目標/ })[0]);

    await waitFor(() => expect(location()).toBe("/goals"));
    await waitFor(() =>
      expect(vi.mocked(getCurrentUser).mock.calls.length).toBeGreaterThan(
        before,
      ),
    );
    expect(log.gets).toBeGreaterThan(1);
  });
});
