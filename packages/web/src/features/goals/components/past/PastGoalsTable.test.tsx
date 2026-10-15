import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import type { AuthUser } from "@/lib/auth";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type {
  GoalGetResponse,
  GoalHistoryResponse,
} from "@shared/schemas/goals";

import { PastGoalsTable } from ".";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

type GoalDto = GoalGetResponse["goals"][number];

let user: AuthUser;
let storageKey: string;

const goalDto = (overrides: Partial<GoalDto>): GoalDto => ({
  id: 1,
  user_id: user.id,
  title: "目標",
  start_date: "2026-07-01",
  end_date: "2026-09-30",
  progress: 80,
  weight: 50,
  content: "",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
  ...overrides,
});

const currentGoal = () =>
  goalDto({
    id: 9,
    title: "現在の目標",
    start_date: "2026-10-01",
    end_date: "2026-12-31",
  });

interface ApiOptions {
  current?: GoalDto[];
  history?: GoalDto[];
  total?: number;
}

/** GET /api/goals/history に届いたクエリを記録する */
const mockApi = ({
  current = [currentGoal()],
  history = [goalDto({ id: 1, title: "過去の目標", content: "過去の内容" })],
  total,
}: ApiOptions = {}): URLSearchParams[] => {
  const queries: URLSearchParams[] = [];
  server.use(
    http.get(apiUrl(API_ENDPOINTS.goalsCurrent), () =>
      HttpResponse.json<GoalGetResponse>({ goals: current }),
    ),
    http.get(apiUrl(API_ENDPOINTS.goalsHistory), ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params);
      const pageSize = Number(params.get("pageSize"));
      return HttpResponse.json<GoalHistoryResponse>({
        items: history,
        meta: {
          page: Number(params.get("page")),
          pageSize,
          total: total ?? history.length,
          totalPages: Math.ceil((total ?? history.length) / pageSize),
        },
        aggregations: { totalCount: total ?? history.length },
      });
    }),
  );
  return queries;
};

const lastQuery = (queries: URLSearchParams[]) =>
  Object.fromEntries(queries[queries.length - 1].entries());

const renderTable = () => renderWithProviders(<PastGoalsTable />);

/** 折りたたまれた「絞り込み条件」を開く */
const openFilter = async (ui: ReturnType<typeof userEvent.setup>) => {
  await ui.click(screen.getByRole("button", { name: "絞り込み条件" }));
};

/** 表の読み込みを待ってから列の見出しを押す（並び順を変えるたびに表が読み込み中の表示に置き換わる） */
const clickHeader = async (
  ui: ReturnType<typeof userEvent.setup>,
  name: RegExp,
) => {
  await screen.findByText("過去の目標");
  await ui.click(screen.getByRole("columnheader", { name }));
};

const readStored = () => {
  const raw = window.localStorage.getItem(storageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
};

beforeEach(() => {
  user = signInTestUser();
  storageKey = `goals:past:filters_${user.id}`;
  window.localStorage.clear();
});

describe("PastGoalsTable（過去の目標）", () => {
  describe("現在の期間の除外", () => {
    it("AC-goals-17: 終了日の条件が空なら、現在の目標の開始日の前日を endDate にし、1 ページ 10 件で検索する", async () => {
      const queries = mockApi();
      renderTable();

      await waitFor(() =>
        expect(queries.some((q) => q.get("endDate") === "2026-09-30")).toBe(
          true,
        ),
      );
      expect(lastQuery(queries)).toEqual({
        page: "1",
        pageSize: "10",
        endDate: "2026-09-30",
      });
    });

    it("AC-goals-17: 応答に現在の期間の目標があれば出さず、件数からも引く", async () => {
      mockApi({
        history: [
          goalDto({ id: 9, title: "現在の目標", end_date: "2026-12-31" }),
          goalDto({ id: 1, title: "過去の目標" }),
        ],
        total: 2,
      });
      renderTable();

      expect(await screen.findByText("過去の目標")).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.queryByText("現在の目標")).not.toBeInTheDocument(),
      );
      expect(screen.getAllByText("1件").length).toBeGreaterThan(0);
    });

    it("AC-goals-17: 現在の目標が無ければ、endDate を付けずに全部を出す", async () => {
      const queries = mockApi({ current: [] });
      renderTable();

      expect(await screen.findByText("過去の目標")).toBeInTheDocument();
      expect(queries.every((q) => !q.has("endDate"))).toBe(true);
    });
  });

  describe("絞り込みと並べ替え", () => {
    it("AC-goals-18: 「絞り込み」で条件を反映し、進捗率は整数に切り捨てて送り、条件を保存する", async () => {
      const queries = mockApi();
      const ui = userEvent.setup();
      renderTable();
      await screen.findByText("過去の目標");
      await openFilter(ui);

      await ui.type(screen.getByPlaceholderText("目標で絞り込み"), "売上");
      await ui.type(screen.getByPlaceholderText("0"), "10.9");
      await ui.type(screen.getByPlaceholderText("100"), "90");
      // 「絞り込み」を押すまでは送らない
      expect(lastQuery(queries).query).toBeUndefined();
      await ui.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => expect(lastQuery(queries).query).toBe("売上"));
      expect(lastQuery(queries)).toMatchObject({
        page: "1",
        minProgress: "10",
        maxProgress: "90",
      });
      expect(readStored()).toMatchObject({
        query: "売上",
        minProgress: 10,
        maxProgress: 90,
        pageSize: 10,
      });
    });

    it("AC-goals-18: 列の見出しを押すと、昇順 → 降順 → 並べ替えなし の順に変わる", async () => {
      const queries = mockApi();
      const ui = userEvent.setup();
      renderTable();

      await clickHeader(ui, /目標/);
      await waitFor(() => expect(lastQuery(queries).sort).toBe("title"));
      await clickHeader(ui, /目標/);
      await waitFor(() => expect(lastQuery(queries).sort).toBe("-title"));
      await clickHeader(ui, /目標/);
      await waitFor(() => expect(lastQuery(queries).sort).toBeUndefined());

      await clickHeader(ui, /期間/);
      await waitFor(() => expect(lastQuery(queries).sort).toBe("start_date"));
    });

    it("AC-goals-18: 保存した条件を戻してから最初の検索をする", async () => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          query: "採用",
          startDate: "2026-01-01",
          endDate: "2026-06-30",
          minProgress: 20,
          maxProgress: null,
          sortBy: "progress",
          sortDirection: "desc",
          pageSize: 20,
        }),
      );
      const queries = mockApi();
      renderTable();

      await waitFor(() => expect(queries.length).toBeGreaterThan(0));
      expect(Object.fromEntries(queries[0].entries())).toEqual({
        page: "1",
        pageSize: "20",
        query: "採用",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        minProgress: "20",
        sort: "-progress",
      });
      await openFilter(userEvent.setup());
      expect(screen.getByPlaceholderText("目標で絞り込み")).toHaveValue("採用");
    });

    it("AC-goals-18: 「クリア」で条件と並び順を初期に戻し、保存した条件を消す", async () => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ query: "採用", sortBy: "name", sortDirection: "asc" }),
      );
      const queries = mockApi();
      const ui = userEvent.setup();
      renderTable();
      await screen.findByText("過去の目標");
      await openFilter(ui);

      await ui.click(screen.getByRole("button", { name: "クリア" }));

      await waitFor(() => expect(lastQuery(queries).query).toBeUndefined());
      expect(lastQuery(queries)).toEqual({
        page: "1",
        pageSize: "10",
        endDate: "2026-09-30",
      });
      expect(screen.getByPlaceholderText("目標で絞り込み")).toHaveValue("");
      // クリアでキーを消したあと、初期の条件があらためて保存される
      expect(readStored()?.query).toBeUndefined();
      expect(readStored()?.sortBy).toBeNull();
    });
  });

  describe("内容と 0 件", () => {
    it("AC-goals-19: 目の印で内容を読むだけのダイアログを出す", async () => {
      mockApi();
      const ui = userEvent.setup();
      renderTable();
      const row = (await screen.findByText("過去の目標")).closest("tr");

      await ui.click(within(row as HTMLElement).getByRole("button"));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveTextContent("過去の内容");
      expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("AC-goals-19: 内容が空なら「内容が設定されていません。」", async () => {
      mockApi({ history: [goalDto({ id: 1, title: "過去の目標" })] });
      const ui = userEvent.setup();
      renderTable();
      const row = (await screen.findByText("過去の目標")).closest("tr");

      await ui.click(within(row as HTMLElement).getByRole("button"));

      expect(await screen.findByRole("dialog")).toHaveTextContent(
        "内容が設定されていません。",
      );
    });

    it("AC-goals-19: 該当が無ければ「該当する目標は見つかりませんでした」", async () => {
      mockApi({ history: [] });
      renderTable();

      expect(
        await screen.findByText("該当する目標は見つかりませんでした"),
      ).toBeInTheDocument();
    });
  });
});
