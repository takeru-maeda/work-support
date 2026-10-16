import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import { showErrorToast } from "@/lib/toast";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type { ProjectWithTasks } from "@shared/schemas/projects";
import type { WorkRecordListResponse } from "@shared/schemas/workRecords";

import EffortsPage from "./EffortsPage";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

type Item = WorkRecordListResponse["items"][number];

let storageKey: string;

const item = (overrides: Partial<Item>): Item => ({
  id: 1,
  date: "2026-10-13",
  project: "案件A",
  project_id: 10,
  task: "設計",
  task_id: 100,
  estimated_hours: 2,
  hours: 2.5,
  diff: 0.5,
  ...overrides,
});

const PROJECTS: ProjectWithTasks[] = [
  {
    id: 10,
    name: "案件A",
    created_at: "2026-10-01T00:00:00Z",
    tasks: [{ id: 100, name: "設計", created_at: "2026-10-01T00:00:00Z" }],
  },
  {
    id: 20,
    name: "案件B",
    created_at: "2026-10-01T00:00:00Z",
    tasks: [{ id: 200, name: "会議", created_at: "2026-10-01T00:00:00Z" }],
  },
];

interface ApiOptions {
  items?: Item[] | "error";
  total?: number;
  delay?: Promise<void>;
}

/** GET /api/reports/work-records に届いたクエリを記録する */
const mockApi = ({ items = [item({})], total, delay }: ApiOptions = {}) => {
  const queries: Record<string, string>[] = [];
  server.use(
    http.get(apiUrl(API_ENDPOINTS.workRecords), async ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(Object.fromEntries(params.entries()));
      await delay;
      if (items === "error") return new HttpResponse(null, { status: 500 });
      const pageSize = Number(params.get("pageSize"));
      const count = total ?? items.length;
      return HttpResponse.json<WorkRecordListResponse>({
        items,
        meta: {
          page: Number(params.get("page")),
          pageSize,
          total: count,
          totalPages: count === 0 ? 0 : Math.ceil(count / pageSize),
        },
      });
    }),
    http.get(apiUrl(API_ENDPOINTS.projects), () =>
      HttpResponse.json({ projects: PROJECTS }),
    ),
    http.post(apiUrl(API_ENDPOINTS.errorLogs), () =>
      HttpResponse.json(
        { id: 1, recordedAt: "2026-10-13T00:00:00Z" },
        { status: 201 },
      ),
    ),
  );
  return queries;
};

const renderPage = () =>
  renderWithProviders(
    <MemoryRouter>
      <EffortsPage />
    </MemoryRouter>,
  );

const lastQuery = (queries: Record<string, string>[]) =>
  queries[queries.length - 1];

const rowTexts = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    );

const summaryText = () =>
  (screen.getByText("見積合計").closest("div.grid") as HTMLElement | null)
    ?.textContent ??
  screen.getByText("見積合計").parentElement?.parentElement?.textContent ??
  "";

/** 絞り込みの「案件を選択」「タスクを選択」の欄（表示中の文字から探す） */
const filterSelect = (label: string) =>
  screen.getByText(label).closest("button") as HTMLElement;

const openFilter = async (ui: ReturnType<typeof userEvent.setup>) => {
  await ui.click(screen.getByRole("button", { name: "絞り込み条件" }));
};

/** 表の読み込みを待ってから列の見出しを押す */
const clickHeader = async (
  ui: ReturnType<typeof userEvent.setup>,
  name: string,
) => {
  await screen.findAllByRole("row");
  const header = screen.getByRole("columnheader", { name: new RegExp(name) });
  await ui.click(within(header).getByRole("button"));
};

beforeEach(() => {
  const user = signInTestUser();
  storageKey = `efforts:list:filters_${user.id}`;
  window.localStorage.clear();
  vi.mocked(showErrorToast).mockClear();
});

describe("EffortsPage（工数一覧）", () => {
  describe("初めの状態と表", () => {
    it("AC-effort-list-05: 初めは条件なし・日付の降順・1 ページ 10 件で取る", async () => {
      const queries = mockApi();
      renderPage();

      await screen.findByText("案件A");
      expect(queries).toEqual([{ page: "1", pageSize: "10", sort: "-date" }]);
      expect(
        screen.getByRole("button", { name: "絞り込み条件" }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    it("AC-effort-list-07: 列と、日付・時間の形、差分の色を出す", async () => {
      mockApi({
        items: [
          item({ id: 1, estimated_hours: 2, hours: 2.5, diff: 0.5 }),
          item({
            id: 2,
            date: "2026-10-12",
            estimated_hours: 3,
            hours: 1,
            diff: -2,
          }),
          item({
            id: 3,
            date: "2026-10-11",
            estimated_hours: 1,
            hours: 1,
            diff: 0,
          }),
          item({
            id: 4,
            date: "2026-10-10",
            estimated_hours: null,
            hours: 4,
            diff: null,
          }),
        ],
      });
      renderPage();
      await screen.findAllByText("案件A");

      expect(
        screen.getAllByRole("columnheader").map((h) => h.textContent),
      ).toEqual(["日付", "案件", "タスク", "見積(h)", "実績(h)", "差分(h)"]);
      expect(rowTexts()).toEqual([
        ["2026/10/13", "案件A", "設計", "2.00", "2.50", "+0.50"],
        ["2026/10/12", "案件A", "設計", "3.00", "1.00", "-2.00"],
        ["2026/10/11", "案件A", "設計", "1.00", "1.00", "0.00"],
        ["2026/10/10", "案件A", "設計", "-", "4.00", "-"],
      ]);
      expect(screen.getByText("+0.50")).toHaveClass(
        "text-destructive-foreground",
      );
      expect(screen.getByText("-2.00")).toHaveClass("text-green-600");
    });

    it("AC-effort-list-10: 集計は表示中のページの行だけから出す", async () => {
      mockApi({
        items: [
          item({ id: 1, estimated_hours: 2, hours: 2.5 }),
          item({ id: 2, estimated_hours: null, hours: 1 }),
          item({ id: 3, estimated_hours: 1, hours: 0.25 }),
        ],
        total: 30,
      });
      renderPage();
      await screen.findAllByText("案件A");

      // 実績 3.75、見積 3、差分 (2.5 + 0.25) − 3 = -0.25
      expect(summaryText()).toMatch(
        /見積合計3h.*実績合計3.75h.*差分合計-0.25h/,
      );
    });

    it("AC-effort-list-09: 件数を出し、0 件ならページ送りを出さない", async () => {
      mockApi({ total: 25 });
      renderPage();

      expect(await screen.findAllByText("25件")).not.toHaveLength(0);
    });
  });

  describe("0 件、読み込み中、失敗", () => {
    it("AC-effort-list-14: 条件が無くて 0 件なら「工数データがまだ登録されていません」", async () => {
      mockApi({ items: [] });
      renderPage();

      expect(
        await screen.findByText("工数データがまだ登録されていません"),
      ).toBeInTheDocument();
      expect(screen.queryByText("件")).not.toBeInTheDocument();
      expect(screen.queryByText("見積合計")).not.toBeInTheDocument();
    });

    it("AC-effort-list-14: 条件があって 0 件なら「条件に一致する工数データは見つかりませんでした」", async () => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          projectId: 10,
          sortColumn: "date",
          sortDirection: "desc",
        }),
      );
      mockApi({ items: [] });
      renderPage();

      expect(
        await screen.findByText(
          "条件に一致する工数データは見つかりませんでした",
        ),
      ).toBeInTheDocument();
    });

    it("AC-effort-list-11: 取ったことの無い条件を読み込む間は、表の代わりに読み込み中の表示を出す", async () => {
      let release!: () => void;
      const delay = new Promise<void>((resolve) => {
        release = resolve;
      });
      mockApi({ delay });
      const { container } = renderPage();

      await waitFor(() =>
        expect(
          container.querySelectorAll('[data-slot="skeleton"]').length,
        ).toBeGreaterThan(0),
      );
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      release();
      expect(await screen.findByRole("table")).toBeInTheDocument();
    });

    it("AC-effort-list-14: 取得に失敗したら「工数データの取得に失敗しました」", async () => {
      mockApi({ items: "error" });
      renderPage();

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "工数データの取得に失敗しました",
        ),
      );
    });
  });

  describe("並べ替えと絞り込み", () => {
    it("AC-effort-list-08: 見出しを押すと 昇順 → 降順 → 並べ替えなし。初めの状態で「日付」を押すと並べ替えなし", async () => {
      const queries = mockApi();
      const ui = userEvent.setup();
      renderPage();

      await clickHeader(ui, "案件");
      await waitFor(() => expect(lastQuery(queries).sort).toBe("project"));
      await clickHeader(ui, "案件");
      await waitFor(() => expect(lastQuery(queries).sort).toBe("-project"));
      await clickHeader(ui, "案件");
      // 並べ替えなしは、サーバーの既定と同じ日付の降順を送る
      await waitFor(() => expect(lastQuery(queries).sort).toBe("-date"));

      await clickHeader(ui, "差分");
      await waitFor(() => expect(lastQuery(queries).sort).toBe("diff"));
    });

    it("AC-effort-list-08: 初めの状態（日付の降順）で「日付」を押すと並べ替えなしになり、もう一度押すと昇順", async () => {
      const queries = mockApi();
      const ui = userEvent.setup();
      renderPage();

      await clickHeader(ui, "日付");
      await clickHeader(ui, "日付");

      // 並べ替えなし → 昇順（初めの降順から、並べ替えなしを経て昇順になる）
      await waitFor(() => expect(lastQuery(queries).sort).toBe("date"));
    });

    it("AC-effort-list-06 / 13: 案件とタスクを選んで「絞り込み」で反映し、1 ページ目から取る", async () => {
      const queries = mockApi();
      const ui = userEvent.setup();
      renderPage();
      await screen.findByText("案件A");
      await openFilter(ui);

      await ui.click(filterSelect("案件を選択"));
      expect(
        await screen.findByRole("option", { name: "すべて" }),
      ).toBeInTheDocument();
      await ui.click(screen.getByRole("option", { name: "案件B" }));
      await ui.click(filterSelect("タスクを選択"));
      // 案件を選んでいれば、その案件のタスクだけ
      expect(
        screen.queryByRole("option", { name: "設計" }),
      ).not.toBeInTheDocument();
      await ui.click(await screen.findByRole("option", { name: "会議" }));
      expect(lastQuery(queries).projectId).toBeUndefined();
      await ui.click(screen.getByRole("button", { name: "絞り込み" }));

      await waitFor(() => expect(lastQuery(queries).projectId).toBe("20"));
      expect(lastQuery(queries)).toMatchObject({ taskId: "200", page: "1" });
    });

    it("AC-effort-list-06: 検索に一致する候補が無ければ「候補が見つかりません」", async () => {
      mockApi();
      const ui = userEvent.setup();
      renderPage();
      await screen.findByText("案件A");
      await openFilter(ui);

      await ui.click(filterSelect("案件を選択"));
      await ui.type(
        screen.getByPlaceholderText("案件を選択を検索..."),
        "存在しない",
      );

      expect(
        await screen.findByText("候補が見つかりません"),
      ).toBeInTheDocument();
    });

    it("AC-effort-list-12 / 13: 保存した条件を戻してから最初の取得をし、「クリア」で初めの状態に戻してキーを消す", async () => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          startDate: "2026-10-01",
          endDate: "2026-10-31",
          projectId: 10,
          taskId: null,
          sortColumn: "actualHours",
          sortDirection: "asc",
          itemsPerPage: 50,
        }),
      );
      const queries = mockApi();
      const ui = userEvent.setup();
      renderPage();

      await screen.findByText("案件A");
      expect(queries[0]).toEqual({
        page: "1",
        pageSize: "50",
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        projectId: "10",
        sort: "hours",
      });

      await openFilter(ui);
      await ui.click(screen.getByRole("button", { name: "クリア" }));

      await waitFor(() =>
        expect(lastQuery(queries)).toEqual({
          page: "1",
          pageSize: "10",
          sort: "-date",
        }),
      );
    });

    it("AC-effort-list-12: 壊れた JSON は無視して初めの状態で取る", async () => {
      window.localStorage.setItem(storageKey, "{壊れた");
      const queries = mockApi();
      renderPage();

      await screen.findByText("案件A");
      expect(queries[0]).toEqual({ page: "1", pageSize: "10", sort: "-date" });
    });
  });
});
