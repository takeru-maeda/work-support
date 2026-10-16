import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { reportUiError } from "@/api/logs";
import { ROUTES } from "@/config/routes";
import { openExternalUrl } from "@/lib/browser";
import { supabase } from "@/lib/supabase";
import { showErrorToast } from "@/lib/toast";
import { renderWithProviders } from "@/test/render";

import ConsentPage from "./ConsentPage";

import type { User } from "@supabase/supabase-js";

vi.mock("@/lib/browser", () => ({ openExternalUrl: vi.fn() }));
vi.mock("@/api/logs", () => ({ reportUiError: vi.fn() }));
vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

const CLIENT_REDIRECT = "http://127.0.0.1:33418/callback?code=xyz&state=s";
const NOT_FOUND =
  "連携の情報が見つからないか、期限が切れています。連携するアプリからもう一度やり直してください。";

const LocationProbe = () => {
  const location = useLocation();
  return (
    <p data-testid="location">{`${location.pathname}${location.search}`}</p>
  );
};

const renderAt = (path: string) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={ROUTES.oauthConsent} element={<ConsentPage />} />
        <Route path={ROUTES.login} element={<p>ログインの画面</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

const signedIn = (loggedIn: boolean) =>
  vi.spyOn(supabase.auth, "getUser").mockResolvedValue({
    data: { user: loggedIn ? ({ id: "u1" } as User) : null },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getUser>>);

const details = (extra: Record<string, unknown> = {}) =>
  vi.spyOn(supabase.auth.oauth, "getAuthorizationDetails").mockResolvedValue({
    data: {
      authorization_id: "abc",
      // ローカルの Supabase で確かめた実際の形（supabase-js の型とは違う）
      redirect_uri: "http://127.0.0.1:33418/callback",
      client: { id: "c1", name: "Claude" },
      scope: "email",
      ...extra,
    },
    error: null,
  } as unknown as Awaited<
    ReturnType<typeof supabase.auth.oauth.getAuthorizationDetails>
  >);

const decided = (method: "approveAuthorization" | "denyAuthorization") =>
  vi.spyOn(supabase.auth.oauth, method).mockResolvedValue({
    data: { redirect_url: CLIENT_REDIRECT },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.oauth.approveAuthorization>>);

beforeEach(() => {
  vi.restoreAllMocks();
  vi.mocked(openExternalUrl).mockReset();
  vi.mocked(showErrorToast).mockClear();
  vi.mocked(reportUiError).mockClear();
});

describe("連携の同意（/oauth/consent）", () => {
  it("AC-mcp-14: ログインしていなければ、元のパスとクエリを redirect に付けてログインへ移す", async () => {
    signedIn(false);
    const getDetails = details();

    renderAt("/oauth/consent?authorization_id=abc");

    await waitFor(() =>
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/login?redirect=%2Foauth%2Fconsent%3Fauthorization_id%3Dabc",
      ),
    );
    expect(getDetails).not.toHaveBeenCalled();
  });

  it("AC-mcp-14: アプリの名前、戻り先、許可される内容と、許可・拒否のボタンを出す", async () => {
    signedIn(true);
    details();

    renderAt("/oauth/consent?authorization_id=abc");

    expect(
      await screen.findByRole("heading", {
        name: "アプリの連携を許可しますか？",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Claude")).toBeInTheDocument();
    expect(
      screen.getByText("戻り先: http://127.0.0.1:33418/callback"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "このアプリが、あなたの工数・目標・週報・ミッションを読み書きできるようになります",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "許可" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "拒否" })).toBeEnabled();
  });

  it.each([
    ["許可", "approveAuthorization"],
    ["拒否", "denyAuthorization"],
  ] as const)(
    "AC-mcp-14: 「%s」で Supabase に伝え、返ってきたアプリの戻り先へ移る",
    async (label, method) => {
      signedIn(true);
      details();
      const decide = decided(method);
      const ui = userEvent.setup();
      renderAt("/oauth/consent?authorization_id=abc");

      await ui.click(await screen.findByRole("button", { name: label }));

      await waitFor(() =>
        expect(openExternalUrl).toHaveBeenCalledWith(CLIENT_REDIRECT),
      );
      expect(decide).toHaveBeenCalledWith("abc", { skipBrowserRedirect: true });
    },
  );

  it("AC-mcp-14: すでに同意したアプリなら、画面を出さずにすぐ戻り先へ移る", async () => {
    signedIn(true);
    vi.spyOn(supabase.auth.oauth, "getAuthorizationDetails").mockResolvedValue({
      data: { redirect_url: CLIENT_REDIRECT },
      error: null,
    } as unknown as Awaited<
      ReturnType<typeof supabase.auth.oauth.getAuthorizationDetails>
    >);

    renderAt("/oauth/consent?authorization_id=abc");

    await waitFor(() =>
      expect(openExternalUrl).toHaveBeenCalledWith(CLIENT_REDIRECT),
    );
    expect(screen.queryByRole("button", { name: "許可" })).toBeNull();
  });

  it("AC-mcp-14: authorization_id が無ければ、やり直しを促す文とホームへのリンクを出す", async () => {
    signedIn(true);
    const getDetails = details();

    renderAt("/oauth/consent");

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ホームへ" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(getDetails).not.toHaveBeenCalled();
  });

  it("AC-mcp-14: 無効か期限切れの authorization_id なら、やり直しを促す文", async () => {
    signedIn(true);
    vi.spyOn(supabase.auth.oauth, "getAuthorizationDetails").mockResolvedValue({
      data: null,
      error: { message: "authorization not found", status: 404 },
    } as Awaited<
      ReturnType<typeof supabase.auth.oauth.getAuthorizationDetails>
    >);

    renderAt("/oauth/consent?authorization_id=expired");

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    expect(reportUiError).not.toHaveBeenCalled();
  });

  it("AC-mcp-14: 認可の内容の取得が 404 以外で失敗したら、同じ文を出し、error_logs に送る", async () => {
    signedIn(true);
    vi.spyOn(supabase.auth.oauth, "getAuthorizationDetails").mockResolvedValue({
      data: null,
      error: { message: "upstream", status: 500 },
    } as unknown as Awaited<
      ReturnType<typeof supabase.auth.oauth.getAuthorizationDetails>
    >);

    renderAt("/oauth/consent?authorization_id=abc");

    expect(await screen.findByText(NOT_FOUND)).toBeInTheDocument();
    await waitFor(() => expect(reportUiError).toHaveBeenCalledTimes(1));
  });

  it("AC-mcp-14: 許可に失敗したら、トーストを出して画面に残る", async () => {
    signedIn(true);
    details();
    vi.spyOn(supabase.auth.oauth, "approveAuthorization").mockResolvedValue({
      data: null,
      error: { message: "boom" },
    } as Awaited<ReturnType<typeof supabase.auth.oauth.approveAuthorization>>);
    const ui = userEvent.setup();
    renderAt("/oauth/consent?authorization_id=abc");

    await ui.click(await screen.findByRole("button", { name: "許可" }));

    await waitFor(() =>
      expect(showErrorToast).toHaveBeenCalledWith(
        "連携の処理に失敗しました。時間を空けて再度お試しください。",
      ),
    );
    expect(openExternalUrl).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "許可" })).toBeEnabled();
    await waitFor(() => expect(reportUiError).toHaveBeenCalledTimes(1));
  });
});
