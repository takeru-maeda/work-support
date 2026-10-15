import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { MAIN_NAVIGATION } from "@/config/navigation";
import { logout } from "@/lib/auth";
import type * as Auth from "@/lib/auth";
import type { AuthUser } from "@/lib/auth";
import HomePage from "@/pages/home/HomePage";
import { themeStorageKey, useThemeStore } from "@/store/theme";
import { useUserStore } from "@/store/user";
import { renderWithProviders } from "@/test/render";

import { AppHeader } from "./header/AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";

vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof Auth>()),
  getAccessToken: async () => null,
  logout: vi.fn(),
}));

const USER: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Taro Yamada",
  email: "taro@example.com",
};

const LocationProbe = () => {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}</p>;
};

const renderShell = (path: string) =>
  renderWithProviders(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider defaultTheme="light">
        <AppHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<p>ほかの画面</p>} />
        </Routes>
        <MobileBottomNav />
        <LocationProbe />
      </ThemeProvider>
    </MemoryRouter>,
  );

const location = () => screen.getByTestId("location").textContent;
/** 上に固定のヘッダー（ホームの見出しの header と区別する） */
const header = () =>
  screen
    .getAllByRole("banner")
    .find((el) =>
      within(el).queryByRole("button", { name: "テーマ切り替え" }),
    ) as HTMLElement;
const bottomNav = () =>
  screen
    .getAllByRole("navigation")
    .find((nav) => !header().contains(nav)) as HTMLElement;
const labels = MAIN_NAVIGATION.map((item) => item.label);

beforeEach(() => {
  window.localStorage.clear();
  useThemeStore.getState().setTheme("light");
  useUserStore.getState().setUser(USER);
  vi.mocked(logout).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ヘッダーとナビ（app-shell）", () => {
  it("AC-app-shell-02 / INV-1: ヘッダーに「Work Support」（/ へのリンク）と、MAIN_NAVIGATION の 5 項目のナビを出す", () => {
    renderShell("/efforts");

    expect(
      within(header()).getByRole("link", { name: /Work Support/ }),
    ).toHaveAttribute("href", "/");
    for (const item of MAIN_NAVIGATION) {
      expect(
        within(header()).getByRole("link", { name: item.label }),
      ).toHaveAttribute("href", item.route);
    }
  });

  it("AC-app-shell-03: パスが完全に一致する項目を選ばれた状態にする（PC は text-foreground、下のナビは text-primary）", () => {
    renderShell("/efforts");

    const desktop = within(header()).getByRole("link", { name: "工数一覧" });
    expect(desktop).toHaveClass("text-foreground");
    expect(desktop).not.toHaveClass("text-muted-foreground");
    expect(
      within(header()).getByRole("link", { name: "工数登録" }),
    ).toHaveClass("text-muted-foreground");
    expect(
      within(bottomNav()).getByRole("link", { name: /工数一覧/ }),
    ).toHaveClass("text-primary");
  });

  it("AC-app-shell-03: /goals/add のような下の階層では、どれも選ばれない", () => {
    renderShell("/goals/add");

    for (const label of labels) {
      expect(within(header()).getByRole("link", { name: label })).toHaveClass(
        "text-muted-foreground",
      );
      expect(
        within(bottomNav()).getByRole("link", { name: new RegExp(label) }),
      ).not.toHaveClass("text-primary");
    }
  });

  it("AC-app-shell-05 / INV-2: 下のナビは 5 項目を並べ、下に余白（pb-3）を取る", () => {
    renderShell("/");

    const links = within(bottomNav()).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(labels);
    expect(bottomNav().outerHTML).toContain("pb-3");
  });

  describe("ユーザーメニュー", () => {
    it.each([
      ["名前が 2 語なら頭文字 2 つ", "Taro Yamada", "TY"],
      ["1 語なら先頭の 2 文字", "taro", "TA"],
    ])("AC-app-shell-04: %s", (_label, name, initials) => {
      useUserStore.getState().setUser({ ...USER, name });
      renderShell("/");

      const button = screen.getByRole("button", { name: /ユーザーメニュー/ });
      expect(button).toHaveTextContent(initials);
    });

    it("AC-app-shell-04: 開くと「プロフィール」「設定」「ログアウト」を出し、選ぶと移る", async () => {
      const ui = userEvent.setup();
      renderShell("/");

      await ui.click(screen.getByRole("button", { name: /ユーザーメニュー/ }));
      expect(
        screen.getAllByRole("menuitem").map((item) => item.textContent),
      ).toEqual(["プロフィール", "設定", "ログアウト"]);
      await ui.click(screen.getByRole("menuitem", { name: "設定" }));

      expect(location()).toBe("/settings");
    });

    it("AC-auth-11: 「ログアウト」でログアウトし、ユーザーのストアを空にして /login に移る", async () => {
      vi.mocked(logout).mockResolvedValue({ success: true });
      const ui = userEvent.setup();
      renderShell("/efforts");

      await ui.click(screen.getByRole("button", { name: /ユーザーメニュー/ }));
      await ui.click(screen.getByRole("menuitem", { name: "ログアウト" }));

      await waitFor(() => expect(location()).toBe("/login"));
      expect(logout).toHaveBeenCalledTimes(1);
      expect(useUserStore.getState().user).toBeNull();
    });

    it("AC-auth-11: ログアウトに失敗したら、利用者には知らせず元の画面に残る", async () => {
      vi.mocked(logout).mockResolvedValue({ success: false, error: "失敗" });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const ui = userEvent.setup();
      renderShell("/efforts");

      await ui.click(screen.getByRole("button", { name: /ユーザーメニュー/ }));
      await ui.click(screen.getByRole("menuitem", { name: "ログアウト" }));

      await waitFor(() => expect(consoleError).toHaveBeenCalledWith("失敗"));
      expect(location()).toBe("/efforts");
      expect(useUserStore.getState().user).toEqual(USER);
    });
  });

  describe("テーマ", () => {
    it("AC-user-settings-09: 「テーマ切り替え」でライトとダークを切り替え、<html> のクラスと localStorage に入れる", async () => {
      const ui = userEvent.setup();
      renderShell("/");
      expect(document.documentElement).toHaveClass("light");

      await ui.click(screen.getByRole("button", { name: "テーマ切り替え" }));

      expect(document.documentElement).toHaveClass("dark");
      expect(document.documentElement).not.toHaveClass("light");
      expect(
        JSON.parse(window.localStorage.getItem(themeStorageKey) ?? "{}"),
      ).toMatchObject({ state: { theme: "dark" } });

      await ui.click(screen.getByRole("button", { name: "テーマ切り替え" }));
      expect(document.documentElement).toHaveClass("light");
    });
  });
});

describe("ホーム（/）", () => {
  it("AC-app-shell-06: 見出しと「ようこそ、{名前}さん」、ホーム以外の 4 項目のカードを出す", () => {
    renderShell("/");

    expect(
      screen.getByRole("heading", { level: 1, name: "Work Support" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ようこそ、Taro Yamadaさん")).toBeInTheDocument();
    const main = screen
      .getByRole("heading", { level: 1 })
      .closest("div.container") as HTMLElement;
    const cards = within(main).getAllByRole("link");
    expect(cards.map((card) => card.getAttribute("href"))).toEqual([
      "/efforts/new",
      "/efforts",
      "/goals",
      "/weekly-report",
    ]);
    expect(main).toHaveTextContent("日々の作業内容と時間を記録");
    expect(main).toHaveTextContent("週次レポートの作成");
  });

  it("AC-app-shell-06: 名前が無ければ「ようこそ」", () => {
    useUserStore.getState().setUser({ ...USER, name: "" });
    renderShell("/");

    expect(screen.getByText("ようこそ")).toBeInTheDocument();
  });
});
