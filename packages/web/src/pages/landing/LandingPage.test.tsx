import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";

import {
  differentiatorsSectionTitle,
  faqSectionTitle,
  faqs,
  featuresSectionTitle,
  howItWorksSectionTitle,
  painSectionTitle,
  solutionSectionTitle,
  useCaseSectionTitle,
} from "./landingContent";
import LandingPage from "./LandingPage";

// ランディングページ（docs/specs/landing/spec.md）。列の数（AC-05）は CSS の出し分けなので E2E で見る
const renderPage = () =>
  renderWithProviders(
    <MemoryRouter initialEntries={["/landing"]}>
      <LandingPage />
    </MemoryRouter>,
  );

const hrefsOf = (name: string | RegExp) =>
  screen
    .getAllByRole("link", { name })
    .map((link) => link.getAttribute("href"));

/** よくある質問の答えの入れ物（開いていると grid-rows-[1fr]） */
const answerContainerOf = (question: string) =>
  screen.getByRole("button", { name: question }).nextElementSibling;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LandingPage", () => {
  it("AC-landing-01: 節の見出しを決まった順に出し、機能の節に id=features を付ける", () => {
    renderPage();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent ?? "");
    const order = [
      painSectionTitle,
      solutionSectionTitle,
      featuresSectionTitle,
      howItWorksSectionTitle,
      useCaseSectionTitle,
      differentiatorsSectionTitle,
      faqSectionTitle,
      "今すぐ始めましょう",
    ].map((title) => headings.findIndex((h) => h.includes(title)));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(document.getElementById("features")).toHaveTextContent(
      featuresSectionTitle,
    );
  });

  it("AC-landing-02: ヘッダーに /landing へのロゴ、テーマの切り替え、ログインと新規登録の入口を出す", () => {
    renderPage();

    const header = screen.getAllByRole("banner")[0];
    expect(
      within(header).getByRole("link", { name: /Work Support/ }),
    ).toHaveAttribute("href", "/landing");
    expect(
      within(header).getByRole("button", { name: "テーマ切り替え" }),
    ).toBeInTheDocument();
    expect(
      within(header).getByRole("link", { name: /ログイン/ }),
    ).toHaveAttribute("href", "/login");
    expect(
      within(header).getByRole("link", { name: /無料で始める/ }),
    ).toHaveAttribute("href", "/signup");
  });

  it("AC-landing-03: ヒーローの文言と、「無料で始める」はどれも /signup、「ログイン」は /login。フッターに今年の著作権表示", () => {
    renderPage();

    expect(
      screen.getByText(/週報作成、まだ手作業ですか？/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/工数を記録するだけで、週報が自動で完成。/),
    ).toBeInTheDocument();
    expect(new Set(hrefsOf(/無料で始める/))).toEqual(new Set(["/signup"]));
    expect(new Set(hrefsOf(/^ログイン$/))).toEqual(new Set(["/login"]));
    expect(hrefsOf("新規登録")).toEqual(["/signup"]);
    expect(
      screen.getByText(
        `© ${new Date().getFullYear()} Work Support. All rights reserved.`,
      ),
    ).toBeInTheDocument();
  });

  it("AC-landing-03: 「機能を見る」で機能の節へなめらかにスクロールする", async () => {
    const scrollIntoView = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => {});
    const ui = userEvent.setup();
    renderPage();

    await ui.click(screen.getByRole("button", { name: /機能を見る/ }));

    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(
      document.getElementById("features"),
    );
  });

  it("AC-landing-04: よくある質問は 4 つで、押すと開き、同時に開くのは 1 つ。もう一度押すと閉じる", async () => {
    const ui = userEvent.setup();
    renderPage();
    expect(faqs).toHaveLength(4);
    const [first, second] = faqs.map((faq) => faq.question);

    expect(answerContainerOf(first)).toHaveClass("grid-rows-[0fr]");
    await ui.click(screen.getByRole("button", { name: first }));
    expect(answerContainerOf(first)).toHaveClass("grid-rows-[1fr]");

    await ui.click(screen.getByRole("button", { name: second }));
    expect(answerContainerOf(second)).toHaveClass("grid-rows-[1fr]");
    expect(answerContainerOf(first)).toHaveClass("grid-rows-[0fr]");

    await ui.click(screen.getByRole("button", { name: second }));
    expect(answerContainerOf(second)).toHaveClass("grid-rows-[0fr]");
  });
});
