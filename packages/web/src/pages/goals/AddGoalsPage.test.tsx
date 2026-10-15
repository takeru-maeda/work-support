import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import { ROUTES } from "@/config/routes";
import type { AuthUser } from "@/lib/auth";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type { GoalGetResponse } from "@shared/schemas/goals";

import AddGoalsPage from "./AddGoalsPage";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

let user: AuthUser;
let storageKey: string;

interface DraftGoal {
  id: string;
  name: string;
  content: string;
  weight: number;
}

/** 入力途中の内容をブラウザに置く（期間の選択はカレンダーを操作せずに、ここで決める） */
const seedDraft = (
  draft: { periodStart?: Date; periodEnd?: Date; goals?: DraftGoal[] } = {},
) => {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      periodStart: new Date(2027, 0, 1),
      periodEnd: new Date(2027, 2, 31),
      goals: [
        { id: "g1", name: "A", content: "Aの内容", weight: 60 },
        { id: "g2", name: "B", content: "", weight: 40 },
      ],
      ...draft,
    }),
  );
};

const readDraft = () => {
  const raw = window.localStorage.getItem(storageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
};

interface ApiOptions {
  /** 現在の目標の終了日。省くと目標なし */
  currentEnd?: string;
  /** 何件目（1 始まり）の作成で失敗させるか */
  failAt?: number;
}

const mockApi = ({ currentEnd, failAt }: ApiOptions = {}) => {
  const posts: Record<string, unknown>[] = [];
  server.use(
    http.get(apiUrl(API_ENDPOINTS.goalsCurrent), () =>
      HttpResponse.json<GoalGetResponse>({
        goals: currentEnd
          ? [
              {
                id: 1,
                user_id: user.id,
                title: "現在の目標",
                start_date: "2026-10-01",
                end_date: currentEnd,
                progress: 0,
                weight: 100,
                content: "",
                created_at: "2026-10-01T00:00:00Z",
                updated_at: "2026-10-01T00:00:00Z",
              },
            ]
          : [],
      }),
    ),
    http.post(apiUrl(API_ENDPOINTS.goals), async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      posts.push(body);
      if (posts.length === failAt) {
        return new HttpResponse(null, { status: 500 });
      }
      return HttpResponse.json(
        {
          created: {
            id: 100 + posts.length,
            user_id: user.id,
            progress: 0,
            created_at: "2026-10-13T00:00:00Z",
            updated_at: "2026-10-13T00:00:00Z",
            ...body,
          },
        },
        { status: 201 },
      );
    }),
    http.post(apiUrl(API_ENDPOINTS.errorLogs), () =>
      HttpResponse.json(
        { id: 1, recordedAt: "2026-10-13T00:00:00Z" },
        { status: 201 },
      ),
    ),
  );
  return posts;
};

const renderPage = async () => {
  renderWithProviders(
    <MemoryRouter initialEntries={[ROUTES.goalsAdd]}>
      <Routes>
        <Route path={ROUTES.goalsAdd} element={<AddGoalsPage />} />
        <Route path={ROUTES.goals} element={<p>目標の一覧</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText("トータルウェイト");
};

const saveButton = () => screen.getByRole("button", { name: "保存" });

/** 目標の行（目標名の入力欄の値から） */
const rowOf = (name: string) => {
  const row = screen.getByDisplayValue(name).closest("div.rounded-lg");
  if (!(row instanceof HTMLElement)) throw new Error(`行が無い: ${name}`);
  return row;
};

const removeButtonOf = (row: HTMLElement) => within(row).getByRole("button");

beforeEach(() => {
  user = signInTestUser();
  storageKey = `goals:add:draft_${user.id}`;
  window.localStorage.clear();
  vi.mocked(showErrorToast).mockClear();
  vi.mocked(showSuccessToast).mockClear();
});

describe("AddGoalsPage（目標の追加）", () => {
  describe("期間", () => {
    it("AC-goals-11: 開始日と終了日を選ぶまで保存できない", async () => {
      mockApi();
      seedDraft({ periodStart: undefined, periodEnd: undefined });
      await renderPage();

      expect(saveButton()).toBeDisabled();
    });

    it("AC-goals-11: 終了日が開始日と同じか前なら、メッセージを出して保存できない", async () => {
      mockApi();
      seedDraft({
        periodStart: new Date(2027, 2, 31),
        periodEnd: new Date(2027, 2, 31),
      });
      await renderPage();

      expect(
        screen.getByText("終了日は開始日より未来の日付を選択してください。"),
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("AC-goals-11: 開始日が現在の目標の終了日と同じか前なら、メッセージを出して保存できない", async () => {
      mockApi({ currentEnd: "2026-12-31" });
      seedDraft({ periodStart: new Date(2026, 11, 31) });
      await renderPage();

      expect(
        await screen.findByText(
          "開始日は既存目標の終了日（2026/12/31）より未来の日付を選択してください。",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "現在の目標期間の終了日（2026/12/31）よりも未来の日付を選択してください。",
        ),
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("AC-goals-11: 開始日が現在の目標の終了日より後なら保存できる", async () => {
      mockApi({ currentEnd: "2026-12-31" });
      seedDraft();
      await renderPage();

      await screen.findByText(
        "現在の目標期間の終了日（2026/12/31）よりも未来の日付を選択してください。",
      );
      expect(saveButton()).toBeEnabled();
    });
  });

  describe("目標の行と重み", () => {
    it("AC-goals-12: 行を足したり消したりでき、最後の 1 行は消せない", async () => {
      mockApi();
      seedDraft({ goals: [{ id: "g1", name: "A", content: "", weight: 100 }] });
      const ui = userEvent.setup();
      await renderPage();

      expect(removeButtonOf(rowOf("A"))).toBeDisabled();

      await ui.click(screen.getByRole("button", { name: "目標を追加" }));
      expect(screen.getByPlaceholderText("目標2")).toBeInTheDocument();
      expect(removeButtonOf(rowOf("A"))).toBeEnabled();

      await ui.click(removeButtonOf(rowOf("A")));
      expect(screen.queryByDisplayValue("A")).not.toBeInTheDocument();
      expect(screen.getAllByPlaceholderText(/^目標\d$/)).toHaveLength(1);
    });

    it("AC-goals-12: 重みの合計を出し、100 を超えたら警告を出して保存できない", async () => {
      mockApi();
      seedDraft();
      const ui = userEvent.setup();
      await renderPage();
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(saveButton()).toBeEnabled();

      const weight = within(rowOf("B")).getByRole("spinbutton");
      await ui.clear(weight);
      await ui.type(weight, "50");

      expect(screen.getByText("110%")).toBeInTheDocument();
      expect(
        screen.getByText(
          "トータルウェイトが100%を超えています。調整してください。",
        ),
      ).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });

    it("AC-goals-12: 合計が 100 でも、重みが 0 の行があると保存できない", async () => {
      mockApi();
      seedDraft({
        goals: [
          { id: "g1", name: "A", content: "", weight: 100 },
          { id: "g2", name: "B", content: "", weight: 0 },
        ],
      });
      await renderPage();

      expect(saveButton()).toBeDisabled();
    });
  });

  describe("保存", () => {
    it("AC-goals-13: 確認で「はい」を押すと、目標名のある行だけを 1 行ずつ作り、入力途中の内容を消して /goals に戻る", async () => {
      const posts = mockApi();
      seedDraft({
        goals: [
          { id: "g1", name: " A ", content: "Aの内容", weight: 60 },
          { id: "g2", name: "  ", content: "名前なし", weight: 10 },
          { id: "g3", name: "B", content: "", weight: 30 },
        ],
      });
      const ui = userEvent.setup();
      await renderPage();

      await ui.click(saveButton());
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent("目標を保存してもよろしいですか？");
      expect(dialog).toHaveTextContent(
        "新しい目標を保存すると、現在の最新目標は編集できなくなります。",
      );
      expect(dialog).toHaveTextContent(
        "保存すると指定した期間の目標は新しく追加することができません。また、期間の更新を行うことはできません。",
      );
      await ui.click(within(dialog).getByRole("button", { name: "はい" }));

      expect(await screen.findByText("目標の一覧")).toBeInTheDocument();
      expect(posts).toEqual([
        {
          title: " A ",
          content: "Aの内容",
          weight: 60,
          start_date: "2027-01-01",
          end_date: "2027-03-31",
        },
        {
          title: "B",
          content: "",
          weight: 30,
          start_date: "2027-01-01",
          end_date: "2027-03-31",
        },
      ]);
      expect(showSuccessToast).toHaveBeenCalledWith("目標を保存しました");
      expect(readDraft()).toBeNull();
    });

    it("AC-goals-13: 「いいえ」なら保存しない", async () => {
      const posts = mockApi();
      seedDraft();
      const ui = userEvent.setup();
      await renderPage();

      await ui.click(saveButton());
      await ui.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "いいえ",
        }),
      );

      expect(posts).toEqual([]);
      expect(screen.queryByText("目標の一覧")).not.toBeInTheDocument();
    });

    it("AC-goals-13: 途中で失敗すると「目標の保存に失敗しました…」を出し、入力は残る（それより前の目標は作られたまま）", async () => {
      const posts = mockApi({ failAt: 2 });
      seedDraft();
      const ui = userEvent.setup();
      await renderPage();

      await ui.click(saveButton());
      await ui.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "はい",
        }),
      );

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "目標の保存に失敗しました。時間を空けて再度お試しください。",
        ),
      );
      expect(posts).toHaveLength(2);
      expect(screen.getByDisplayValue("A")).toBeInTheDocument();
      expect(screen.queryByText("目標の一覧")).not.toBeInTheDocument();
      expect(readDraft()).not.toBeNull();
    });
  });

  describe("入力途中の内容", () => {
    it("AC-goals-14: 前に入力した内容を戻し、変わるたびにブラウザに保存する", async () => {
      mockApi();
      seedDraft();
      const ui = userEvent.setup();
      await renderPage();

      expect(screen.getByDisplayValue("A")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Aの内容")).toBeInTheDocument();

      const name = screen.getByDisplayValue("B");
      await ui.type(name, "改");

      expect(readDraft()).toMatchObject({
        goals: [
          expect.objectContaining({ name: "A" }),
          expect.objectContaining({ name: "B改" }),
        ],
      });
    });

    it("AC-goals-14: 何も入っていなければキーを消す", async () => {
      mockApi();
      seedDraft({
        periodStart: undefined,
        periodEnd: undefined,
        goals: [{ id: "g1", name: "A", content: "", weight: 0 }],
      });
      const ui = userEvent.setup();
      await renderPage();

      await ui.clear(screen.getByDisplayValue("A"));

      expect(readDraft()).toBeNull();
    });

    it("AC-goals-14: キャンセルでは入力途中の内容を消さない", async () => {
      mockApi();
      seedDraft();
      const ui = userEvent.setup();
      await renderPage();

      await ui.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(await screen.findByText("目標の一覧")).toBeInTheDocument();
      expect(readDraft()).not.toBeNull();
    });

    it("AC-goals-14: 壊れた JSON なら空から始める", async () => {
      mockApi();
      window.localStorage.setItem(storageKey, "{壊れた");
      await renderPage();

      expect(screen.getByPlaceholderText("目標1")).toHaveValue("");
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });
});
