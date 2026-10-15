import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ROUTES } from "@/config/routes";
import {
  getCurrentUser,
  login,
  requestPasswordReset,
  signup,
  updatePassword,
} from "@/lib/auth";
import type * as Auth from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { showSuccessToast } from "@/lib/toast";
import { renderWithProviders } from "@/test/render";

import LoginPage from "./LoginPage";
import ResetPasswordPage from "./ResetPasswordPage";
import SignupPage from "./SignupPage";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof Auth>()),
  getAccessToken: async () => null,
  login: vi.fn(),
  signup: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

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
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.signup} element={<SignupPage />} />
        <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
        <Route path="*" element={<p>ほかの画面</p>} />
      </Routes>
      <LocationProbe />
    </MemoryRouter>,
  );

const location = () => screen.getByTestId("location").textContent;

const failure = (error?: string) => ({
  success: false as const,
  user: null,
  session: null,
  error,
});

beforeEach(() => {
  vi.mocked(login).mockReset();
  vi.mocked(signup).mockReset();
  vi.mocked(requestPasswordReset).mockReset();
  vi.mocked(updatePassword).mockReset();
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(showSuccessToast).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("ログイン（/login）", () => {
  it("AC-auth-04: 見出し、入力欄、パスワードの表示の切り替え、リンクを出す", async () => {
    const ui = userEvent.setup();
    renderAt("/login");

    expect(
      screen.getByText("アカウントにログインしてください"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeRequired();
    const password = screen.getByLabelText("パスワード");
    expect(password).toBeRequired();
    expect(password).toHaveAttribute("type", "password");
    await ui.click(screen.getByRole("button", { name: /パスワードを表示/ }));
    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("link", { name: "パスワードをお忘れですか？" }),
    ).toHaveAttribute("href", "/reset-password");
    expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute(
      "href",
      "/signup",
    );
  });

  it("AC-auth-05: 成功したら / に移る。送信中は「ログイン中...」", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof login>>) => void;
    vi.mocked(login).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const ui = userEvent.setup();
    renderAt("/login");

    await ui.type(screen.getByLabelText("メールアドレス"), "a@example.com");
    await ui.type(screen.getByLabelText("パスワード"), "secret1");
    await ui.click(screen.getByRole("button", { name: "ログイン" }));

    expect(
      await screen.findByRole("button", { name: "ログイン中..." }),
    ).toBeDisabled();
    expect(login).toHaveBeenCalledWith("a@example.com", "secret1");
    resolve({ success: true, user: null, session: null });
    await waitFor(() => expect(location()).toBe("/"));
  });

  it.each([
    [
      "Supabase の文があればそのまま",
      "Invalid login credentials",
      "Invalid login credentials",
    ],
    [
      "文が無ければ「ログインに失敗しました」",
      undefined,
      "ログインに失敗しました",
    ],
  ])("AC-auth-05: 失敗したら、%s出す", async (_label, error, shown) => {
    vi.mocked(login).mockResolvedValue(failure(error));
    const ui = userEvent.setup();
    renderAt("/login");

    await ui.type(screen.getByLabelText("メールアドレス"), "a@example.com");
    await ui.type(screen.getByLabelText("パスワード"), "wrong-pw");
    await ui.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByText(shown)).toBeInTheDocument();
    expect(location()).toBe("/login");
  });
});

describe("新規登録（/signup）", () => {
  const fill = async (
    ui: ReturnType<typeof userEvent.setup>,
    password: string,
    confirm: string,
  ) => {
    await ui.type(screen.getByLabelText("名前"), "山田太郎");
    await ui.type(screen.getByLabelText("メールアドレス"), "a@example.com");
    await ui.type(screen.getByLabelText("パスワード"), password);
    await ui.type(screen.getByLabelText("パスワード（確認）"), confirm);
  };

  it("AC-auth-06: パスワードの欄には minLength=6 がある", () => {
    renderAt("/signup");

    expect(screen.getByLabelText("パスワード")).toHaveAttribute(
      "minlength",
      "6",
    );
    expect(screen.getByLabelText("名前")).toBeRequired();
  });

  it("AC-auth-06: パスワードが一致しなければ「パスワードが一致しません」を出して送らない", async () => {
    const ui = userEvent.setup();
    renderAt("/signup");

    await fill(ui, "secret1", "secret2");
    await ui.click(screen.getByRole("button", { name: "登録" }));

    expect(
      await screen.findByText("パスワードが一致しません"),
    ).toBeInTheDocument();
    expect(signup).not.toHaveBeenCalled();
  });

  it("AC-auth-07: 名前付きで登録し、成功したらトーストを出して / に移る", async () => {
    vi.mocked(signup).mockResolvedValue({
      success: true,
      user: null,
      session: null,
    });
    const ui = userEvent.setup();
    renderAt("/signup");

    await fill(ui, "secret1", "secret1");
    await ui.click(screen.getByRole("button", { name: "登録" }));

    await waitFor(() => expect(location()).toBe("/"));
    expect(signup).toHaveBeenCalledWith("山田太郎", "a@example.com", "secret1");
    expect(showSuccessToast).toHaveBeenCalledWith(
      "確認メールをお送りしました。メール内の手順に従ってアカウントを有効化してください。",
    );
  });

  it.each([
    [
      "Supabase の文があればそのまま",
      "User already registered",
      "User already registered",
    ],
    ["文が無ければ「登録に失敗しました」", undefined, "登録に失敗しました"],
  ])("AC-auth-07: 失敗したら、%s出す", async (_label, error, shown) => {
    vi.mocked(signup).mockResolvedValue(failure(error));
    const ui = userEvent.setup();
    renderAt("/signup");

    await fill(ui, "secret1", "secret1");
    await ui.click(screen.getByRole("button", { name: "登録" }));

    expect(await screen.findByText(shown)).toBeInTheDocument();
    expect(location()).toBe("/signup");
  });
});

describe("パスワードの再設定（/reset-password）", () => {
  it("AC-auth-08: メールアドレスを送ると、案内を出す", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ success: true });
    const ui = userEvent.setup();
    renderAt("/reset-password");

    expect(
      screen.getByText("登録されているメールアドレスを入力してください"),
    ).toBeInTheDocument();
    await ui.type(screen.getByLabelText("メールアドレス"), "a@example.com");
    await ui.click(screen.getByRole("button", { name: "次へ" }));

    expect(
      await screen.findByText(
        "パスワード再設定用のメールを送信しました。メールをご確認ください。",
      ),
    ).toBeInTheDocument();
    expect(requestPasswordReset).toHaveBeenCalledWith("a@example.com");
  });

  it("AC-auth-08: 失敗して文が無ければ「パスワードリセットメールの送信に失敗しました」", async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({ success: false });
    const ui = userEvent.setup();
    renderAt("/reset-password");

    await ui.type(screen.getByLabelText("メールアドレス"), "a@example.com");
    await ui.click(screen.getByRole("button", { name: "次へ" }));

    expect(
      await screen.findByText("パスワードリセットメールの送信に失敗しました"),
    ).toBeInTheDocument();
  });

  it("AC-auth-09: URL に error があれば、その説明を出す", async () => {
    window.history.replaceState(
      {},
      "",
      "/reset-password#error=access_denied&error_description=Email+link+is+invalid",
    );
    renderAt("/reset-password");

    expect(
      await screen.findByText("Email link is invalid"),
    ).toBeInTheDocument();
  });

  /** 再設定のリンクで開いた状態にする（セッションの作成は差し替える） */
  const openRecoveryLink = () => {
    window.history.replaceState(
      {},
      "",
      "/reset-password#access_token=at&refresh_token=rt&type=recovery",
    );
    vi.spyOn(supabase.auth, "setSession").mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    } as never);
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u",
      name: "u",
      email: "a@example.com",
    });
  };

  it("AC-auth-09: リンクのトークンでセッションを作り、「新しいパスワードを入力してください」に進む", async () => {
    openRecoveryLink();
    renderAt("/reset-password");

    expect(
      await screen.findByText("新しいパスワードを入力してください"),
    ).toBeInTheDocument();
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: "at",
      refresh_token: "rt",
    });
  });

  it.each([
    ["一致しない", "secret1", "secret2", "パスワードが一致しません"],
    ["6 文字未満", "abc", "abc", "パスワードは6文字以上で入力してください"],
  ])(
    "AC-auth-10: 新しいパスワードが%sと止める",
    async (_label, password, confirm, message) => {
      openRecoveryLink();
      const ui = userEvent.setup();
      renderAt("/reset-password");
      await screen.findByText("新しいパスワードを入力してください");

      await ui.type(screen.getByLabelText("新しいパスワード"), password);
      await ui.type(screen.getByLabelText("パスワード確認"), confirm);
      await ui.click(
        screen.getByRole("button", { name: "パスワードをリセット" }),
      );

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(updatePassword).not.toHaveBeenCalled();
    },
  );

  it("AC-auth-10: 成功したらログアウトして /login?reset=success に移る", async () => {
    openRecoveryLink();
    vi.mocked(updatePassword).mockResolvedValue({ success: true } as never);
    const signOut = vi
      .spyOn(supabase.auth, "signOut")
      .mockResolvedValue({ error: null });
    const ui = userEvent.setup();
    renderAt("/reset-password");
    await screen.findByText("新しいパスワードを入力してください");

    await ui.type(screen.getByLabelText("新しいパスワード"), "secret1");
    await ui.type(screen.getByLabelText("パスワード確認"), "secret1");
    await ui.click(
      screen.getByRole("button", { name: "パスワードをリセット" }),
    );

    await waitFor(() => expect(location()).toBe("/login?reset=success"));
    expect(updatePassword).toHaveBeenCalledWith("secret1");
    expect(signOut).toHaveBeenCalledWith();
  });
});
