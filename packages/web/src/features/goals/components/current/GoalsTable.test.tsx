import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import type { AuthUser } from "@/lib/auth";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type { GoalGetResponse } from "@shared/schemas/goals";

import { GoalsTable } from ".";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

type GoalDto = GoalGetResponse["goals"][number];

let user: AuthUser;

const goalDto = (overrides: Partial<GoalDto>): GoalDto => ({
  id: 1,
  user_id: user.id,
  title: "目標",
  start_date: "2026-10-01",
  end_date: "2026-12-31",
  progress: 0,
  weight: 50,
  content: "",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  ...overrides,
});

/** 重み 60・進捗 50 の A と、重み 40・進捗 20 の B。全体 35.0%、加重 38.0% */
const twoGoals = () => [
  goalDto({ id: 1, title: "A", weight: 60, progress: 50, content: "Aの内容" }),
  goalDto({ id: 2, title: "B", weight: 40, progress: 20 }),
];

interface ApiLog {
  puts: { id: string; body: Record<string, unknown> }[];
  deletes: string[];
  previousWeekQueries: URLSearchParams[];
}

interface ApiOptions {
  goals?: GoalDto[];
  /** 前週の進捗（goal_id → 進捗率）。"error" なら 500 */
  previous?: Record<number, number> | "error";
  /** 失敗させる PUT の目標 ID */
  failPutIds?: number[];
  failDelete?: boolean;
}

const mockApi = ({
  goals = twoGoals(),
  previous = {},
  failPutIds = [],
  failDelete = false,
}: ApiOptions = {}): ApiLog => {
  const log: ApiLog = { puts: [], deletes: [], previousWeekQueries: [] };
  let current = goals;
  server.use(
    http.get(apiUrl(API_ENDPOINTS.goalsCurrent), () =>
      HttpResponse.json<GoalGetResponse>({ goals: current }),
    ),
    http.get(apiUrl(API_ENDPOINTS.goalsPreviousWeekProgress), ({ request }) => {
      const params = new URL(request.url).searchParams;
      log.previousWeekQueries.push(params);
      if (previous === "error") return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({
        referenceDate: params.get("referenceDate"),
        previousWeekEnd: "2026-10-11",
        progress: Object.entries(previous).map(([id, progress]) => ({
          goal_id: Number(id),
          progress,
          recorded_at: "2026-10-11",
          source: "history",
        })),
      });
    }),
    http.put(
      `${apiUrl(API_ENDPOINTS.goals)}/:id`,
      async ({ params, request }) => {
        const id = String(params.id);
        const body = (await request.json()) as Record<string, unknown>;
        log.puts.push({ id, body });
        if (failPutIds.includes(Number(id))) {
          return new HttpResponse(null, { status: 500 });
        }
        current = current.map((g) =>
          g.id === Number(id)
            ? {
                ...g,
                ...(body.title === undefined
                  ? {}
                  : { title: body.title as string }),
                ...(body.weight === undefined
                  ? {}
                  : { weight: body.weight as number }),
                ...(body.progress === undefined
                  ? {}
                  : { progress: body.progress as number }),
                ...(body.content === undefined
                  ? {}
                  : { content: body.content as string }),
              }
            : g,
        );
        return HttpResponse.json({
          updated: current.find((g) => g.id === Number(id)),
        });
      },
    ),
    http.delete(`${apiUrl(API_ENDPOINTS.goals)}/:id`, ({ params }) => {
      log.deletes.push(String(params.id));
      if (failDelete) return new HttpResponse(null, { status: 500 });
      current = current.filter((g) => g.id !== Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(apiUrl(API_ENDPOINTS.errorLogs), () =>
      HttpResponse.json(
        { id: 1, recordedAt: "2026-10-13T00:00:00Z" },
        { status: 201 },
      ),
    ),
  );
  return log;
};

const renderTable = async () => {
  renderWithProviders(
    <MemoryRouter>
      <GoalsTable />
    </MemoryRouter>,
  );
  await screen.findByText("全体進捗");
};

/** 目標名の入力欄の値から、その行を返す */
const rowOf = (name: string) => {
  const row = screen.getByDisplayValue(name).closest("tr");
  if (!row) throw new Error(`行が見つかりません: ${name}`);
  return row;
};

/** 行の入力欄（目標名、重み、進捗率）とボタン（内容、削除） */
const cellsOf = (name: string) => {
  const row = rowOf(name);
  const [weight, progress] = within(row).getAllByRole("spinbutton");
  const [content, remove] = within(row).getAllByRole("button");
  return {
    name: within(row).getByRole("textbox"),
    weight,
    progress,
    content,
    remove,
  };
};

/** 「全体進捗」「加重進捗」のカードの文字 */
const cardText = (title: string) => {
  const card = screen.getByText(title).closest("div.rounded-lg");
  return card?.textContent ?? "";
};

const updateButton = () => screen.getByRole("button", { name: "更新" });

beforeEach(() => {
  user = signInTestUser();
  vi.mocked(showErrorToast).mockClear();
  vi.mocked(showSuccessToast).mockClear();
});

describe("GoalsTable（現在の目標）", () => {
  describe("表示", () => {
    it("AC-goals-02: 期間と、全体進捗（単純平均）と加重進捗を小数第 1 位で出す", async () => {
      mockApi({
        goals: [
          goalDto({ id: 1, title: "A", weight: 60, progress: 50 }),
          goalDto({
            id: 2,
            title: "B",
            weight: 40,
            progress: 20,
            start_date: "2026-09-15",
            end_date: "2026-11-30",
          }),
        ],
      });
      await renderTable();

      expect(
        screen.getByText(
          `${new Date(2026, 8, 15).toLocaleDateString()} - ${new Date(2026, 11, 31).toLocaleDateString()}`,
        ),
      ).toBeInTheDocument();
      expect(cardText("全体進捗")).toContain("35.0%");
      expect(cardText("加重進捗")).toContain("38.0%");
    });

    it("AC-goals-02: 表で編集中の値で計算し直す", async () => {
      mockApi();
      const ui = userEvent.setup();
      await renderTable();

      const { progress } = cellsOf("B");
      await ui.clear(progress);
      await ui.type(progress, "80");

      // A 50 / B 80 → 全体 65.0、加重 (50×60 + 80×40) / 100 = 62.0
      expect(cardText("全体進捗")).toContain("65.0%");
      expect(cardText("加重進捗")).toContain("62.0%");
    });

    it("AC-goals-02: 目標が無ければ「目標が設定されていません」を出す", async () => {
      mockApi({ goals: [] });
      renderWithProviders(
        <MemoryRouter>
          <GoalsTable />
        </MemoryRouter>,
      );

      expect(
        await screen.findByText("目標が設定されていません"),
      ).toBeInTheDocument();
    });
  });

  describe("編集と更新", () => {
    it("AC-goals-03: 進捗率は範囲の外を 0 / 100 にし、重みは整数に切り捨てる", async () => {
      mockApi();
      const ui = userEvent.setup();
      await renderTable();
      const { weight, progress } = cellsOf("A");

      await ui.clear(progress);
      await ui.type(progress, "150");
      expect(progress).toHaveValue(100);

      await ui.clear(weight);
      await ui.type(weight, "12.7");
      expect(weight).toHaveValue(12);
    });

    it("AC-goals-04: 変更が無いと「更新」は押せない", async () => {
      mockApi();
      await renderTable();

      expect(updateButton()).toBeDisabled();
    });

    it("AC-goals-04: 重みの合計が 100 でないと警告を出し、「更新」は押せない", async () => {
      mockApi();
      const ui = userEvent.setup();
      await renderTable();
      const { weight } = cellsOf("A");

      await ui.clear(weight);
      await ui.type(weight, "50");

      expect(screen.getByText("⚠️ トータルウェイト: 90%")).toBeInTheDocument();
      expect(
        screen.getByText("(100%になるようにしてください)"),
      ).toBeInTheDocument();
      expect(updateButton()).toBeDisabled();
    });

    it("AC-goals-05: 変更のある目標だけを順に PUT し、全部成功したら「目標を更新しました」", async () => {
      const log = mockApi();
      const ui = userEvent.setup();
      await renderTable();

      const a = cellsOf("A");
      await ui.clear(a.weight);
      await ui.type(a.weight, "70");
      const b = cellsOf("B");
      await ui.clear(b.weight);
      await ui.type(b.weight, "30");
      await ui.clear(b.progress);
      await ui.type(b.progress, "25.5");
      await ui.click(updateButton());

      await waitFor(() =>
        expect(showSuccessToast).toHaveBeenCalledWith("目標を更新しました"),
      );
      expect(log.puts).toEqual([
        { id: "1", body: { title: "A", weight: 70, progress: 50 } },
        { id: "2", body: { title: "B", weight: 30, progress: 25.5 } },
      ]);
    });

    it("AC-goals-05: 1 件目で失敗すると「目標の更新に失敗しました…」を出し、編集中の値は残る", async () => {
      const log = mockApi({ failPutIds: [1] });
      const ui = userEvent.setup();
      await renderTable();

      const a = cellsOf("A");
      await ui.clear(a.weight);
      await ui.type(a.weight, "70");
      const b = cellsOf("B");
      await ui.clear(b.weight);
      await ui.type(b.weight, "30");
      await ui.click(updateButton());

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "目標の更新に失敗しました。時間を空けて再度お試しください。",
        ),
      );
      expect(log.puts.map((p) => p.id)).toEqual(["1"]);
      expect(cellsOf("A").weight).toHaveValue(70);
      expect(cellsOf("B").weight).toHaveValue(30);
    });

    it("AC-goals-05: 2 件目で失敗すると、1 件目は保存済みのまま、まだ保存していない編集は消える（既知の落とし穴）", async () => {
      const log = mockApi({ failPutIds: [2] });
      const ui = userEvent.setup();
      await renderTable();

      const a = cellsOf("A");
      await ui.clear(a.weight);
      await ui.type(a.weight, "70");
      const b = cellsOf("B");
      await ui.clear(b.weight);
      await ui.type(b.weight, "30");
      await ui.click(updateButton());

      await waitFor(() => expect(showErrorToast).toHaveBeenCalled());
      expect(log.puts.map((p) => p.id)).toEqual(["1", "2"]);
      await waitFor(() => expect(cellsOf("B").weight).toHaveValue(40));
      expect(cellsOf("A").weight).toHaveValue(70);
    });
  });

  describe("内容のダイアログ", () => {
    it("AC-goals-07: 内容を編集して保存すると PUT { content } を送り、「内容を更新しました」を出して閉じる", async () => {
      const log = mockApi();
      const ui = userEvent.setup();
      await renderTable();

      await ui.click(cellsOf("A").content);
      const dialog = await screen.findByRole("dialog");
      const textarea =
        within(dialog).getByPlaceholderText("目標の内容を入力してください");
      expect(textarea).toHaveValue("Aの内容");
      await ui.clear(textarea);
      await ui.type(textarea, "新しい内容");
      await ui.click(within(dialog).getByRole("button", { name: "保存" }));

      await waitFor(() =>
        expect(showSuccessToast).toHaveBeenCalledWith("内容を更新しました"),
      );
      expect(log.puts).toEqual([{ id: "1", body: { content: "新しい内容" } }]);
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("AC-goals-07: 保存に失敗しても「内容の更新に失敗しました…」を出して閉じる", async () => {
      mockApi({ failPutIds: [1] });
      const ui = userEvent.setup();
      await renderTable();

      await ui.click(cellsOf("A").content);
      const dialog = await screen.findByRole("dialog");
      await ui.click(within(dialog).getByRole("button", { name: "保存" }));

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "内容の更新に失敗しました。時間を空けて再度お試しください。",
        ),
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });
  });

  describe("削除", () => {
    it("AC-goals-08: 表で編集中の目標名（前後の空白を除いた入力）と一致したときだけ削除でき、DELETE を送る", async () => {
      const log = mockApi();
      const ui = userEvent.setup();
      await renderTable();

      const a = cellsOf("A");
      await ui.clear(a.name);
      await ui.type(a.name, "A改");
      await ui.click(a.remove);
      const dialog = await screen.findByRole("alertdialog");
      const input = within(dialog).getByPlaceholderText("目標名を入力");
      const confirm = within(dialog).getByRole("button", { name: "削除する" });

      await ui.type(input, "A");
      expect(confirm).toBeDisabled();
      await ui.type(input, "改  ");
      expect(confirm).toBeEnabled();
      await ui.click(confirm);

      await waitFor(() =>
        expect(showSuccessToast).toHaveBeenCalledWith("目標を削除しました"),
      );
      expect(log.deletes).toEqual(["1"]);
    });

    it("AC-goals-08: 削除に失敗したら「目標の削除に失敗しました…」を出す", async () => {
      mockApi({ failDelete: true });
      const ui = userEvent.setup();
      await renderTable();

      await ui.click(cellsOf("B").remove);
      const dialog = await screen.findByRole("alertdialog");
      await ui.type(within(dialog).getByPlaceholderText("目標名を入力"), "B");
      await ui.click(within(dialog).getByRole("button", { name: "削除する" }));

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "目標の削除に失敗しました。時間を空けて再度お試しください。",
        ),
      );
    });
  });

  describe("前週からの差分", () => {
    it("AC-goals-09: 端末の今日の日付で前週の進捗を取り、保存済みの重みで計算した前週の値との差分を出す", async () => {
      // 前週 A 40 / B 20 → 全体 30.0、加重 32.0。今 A 50 / B 20 → 全体 +5.0、加重 +6.0
      const log = mockApi({ previous: { 1: 40, 2: 20 } });
      await renderTable();

      await waitFor(() => expect(cardText("全体進捗")).toContain("+5.0%"));
      expect(cardText("加重進捗")).toContain("+6.0%");
      expect(screen.getByText("+5.0%")).toHaveClass("text-green-600");
      expect(log.previousWeekQueries[0].get("referenceDate")).toBe(
        dayjs().format("YYYY-MM-DD"),
      );
    });

    it("AC-goals-09: 応答に無い目標は保存済みの進捗率で数え、下がっていれば赤で出す", async () => {
      // 前週 A 60 / B（応答に無い）20 → 全体 40.0。今 35.0 → -5.0
      mockApi({ previous: { 1: 60 } });
      await renderTable();

      await waitFor(() => expect(cardText("全体進捗")).toContain("-5.0%"));
      expect(screen.getByText("-5.0%")).toHaveClass("text-red-600");
    });

    it("AC-goals-09: 表で進捗率を変えると、差分も変わる", async () => {
      mockApi({ previous: { 1: 50, 2: 20 } });
      const ui = userEvent.setup();
      await renderTable();
      await waitFor(() => expect(cardText("全体進捗")).toContain("+0.0%"));
      expect(screen.getAllByText("+0.0%")[0]).toHaveClass(
        "text-muted-foreground",
      );

      const { progress } = cellsOf("B");
      await ui.clear(progress);
      await ui.type(progress, "40");

      expect(cardText("全体進捗")).toContain("+10.0%");
    });

    it("AC-goals-09: 取得に失敗したら「前週の進捗取得に失敗しました…」を出し、差分は +0.0%", async () => {
      mockApi({ previous: "error" });
      await renderTable();

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "前週の進捗取得に失敗しました。時間を空けて再度お試しください。",
        ),
      );
      expect(cardText("全体進捗")).toContain("+0.0%");
      expect(cardText("加重進捗")).toContain("+0.0%");
    });
  });
});
