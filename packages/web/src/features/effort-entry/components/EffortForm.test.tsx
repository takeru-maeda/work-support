import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import type { AuthUser } from "@/lib/auth";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type {
  EffortDraftResponse,
  EffortEntry as EffortEntryDto,
} from "@shared/schemas/effort";
import type { ProjectWithTasks } from "@shared/schemas/projects";

import { EffortForm } from "./EffortForm";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

let user: AuthUser;

const dto = (overrides: Partial<EffortEntryDto> = {}): EffortEntryDto => ({
  project_id: null,
  project_name: "案件A",
  task_id: null,
  task_name: "設計",
  estimated_hours: null,
  hours: 1,
  ...overrides,
});

interface ApiOptions {
  /** サーバーの下書きのエントリー。null なら下書きなし */
  entries?: EffortEntryDto[] | null;
  date?: string | null;
  projects?: ProjectWithTasks[] | "error";
  submit?: "ok" | "error";
  submitDelay?: Promise<void>;
}

interface ApiLog {
  submitted: { entries: EffortEntryDto[]; date: string }[];
  projectGets: number;
}

const mockApi = ({
  entries = null,
  date = "2026-10-13",
  projects = [],
  submit = "ok",
  submitDelay,
}: ApiOptions = {}): ApiLog => {
  const log: ApiLog = { submitted: [], projectGets: 0 };
  server.use(
    http.get(apiUrl(API_ENDPOINTS.effortDraft), () => {
      if (!entries) return new HttpResponse(null, { status: 204 });
      return HttpResponse.json<EffortDraftResponse>({
        draft: {
          entries,
          memo: null,
          date,
          updated_at: "2026-10-13T00:00:00Z",
          client_updated_at: "2026-10-13T00:00:00Z",
        },
      });
    }),
    http.put(apiUrl(API_ENDPOINTS.effortDraft), () =>
      HttpResponse.json({
        applied: true,
        draft: {
          user_id: user.id,
          date: null,
          updated_at: "2026-10-13T00:00:00Z",
        },
      }),
    ),
    http.delete(
      apiUrl(API_ENDPOINTS.effortDraft),
      () => new HttpResponse(null, { status: 204 }),
    ),
    http.get(apiUrl(API_ENDPOINTS.projects), () => {
      log.projectGets += 1;
      if (projects === "error") return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ projects });
    }),
    http.post(apiUrl(API_ENDPOINTS.effortEntries), async ({ request }) => {
      log.submitted.push((await request.json()) as ApiLog["submitted"][number]);
      await submitDelay;
      if (submit === "error") return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ saved: [] }, { status: 201 });
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

const renderForm = async () => {
  renderWithProviders(<EffortForm />);
  await screen.findByPlaceholderText("自由にご入力ください");
};

const actualInputs = () => screen.queryAllByPlaceholderText("実績(h)");
const estimateInputs = () => screen.queryAllByPlaceholderText("見積(h)");
const projectCards = () =>
  screen.queryAllByRole("button", { name: "案件を削除" });
const submitButton = () => screen.getByRole("button", { name: /^送信/ });

/** 集計の「案件別集計」の行の文字 */
const summaryRowText = (projectName: string) => {
  const heading = screen.getByText("案件別集計");
  const section = heading.parentElement as HTMLElement;
  const row = within(section).getByText(projectName).parentElement;
  return row?.textContent ?? "";
};

const totalsText = () =>
  (screen.getByText("全体合計").parentElement as HTMLElement).textContent ?? "";

beforeEach(() => {
  user = signInTestUser();
  window.localStorage.clear();
  vi.mocked(showErrorToast).mockClear();
  vi.mocked(showSuccessToast).mockClear();
});

describe("EffortForm（工数登録）", () => {
  describe("画面の構成", () => {
    it("AC-effort-entry-12: 「日付」「工数入力」「メモ」「送信」の順で、集計はエントリーがあるときだけ。日付は最初は未選択", async () => {
      mockApi();
      await renderForm();

      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["日付", "工数入力", "メモ"]);
      expect(screen.getByText("日付を選択")).toBeInTheDocument();
      expect(submitButton()).toBeDisabled();
    });

    it("AC-effort-entry-12: エントリーがあれば「集計」を「工数入力」と「メモ」の間に出す", async () => {
      mockApi({ entries: [dto()] });
      await renderForm();

      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["日付", "工数入力", "集計", "メモ"]);
    });
  });

  describe("エントリーの追加と削除", () => {
    it("AC-effort-entry-13: 「工数エントリーを追加」で、見積が空・実績が 0 のタスクの行を 1 つ持つカードを足す", async () => {
      mockApi();
      const ui = userEvent.setup();
      await renderForm();

      await ui.click(
        screen.getByRole("button", { name: /工数エントリーを追加/ }),
      );

      expect(projectCards()).toHaveLength(1);
      expect(
        estimateInputs().map((i) => (i as HTMLInputElement).value),
      ).toEqual([""]);
      expect(actualInputs().map((i) => (i as HTMLInputElement).value)).toEqual([
        "0",
      ]);
    });

    it("AC-effort-entry-13: 「タスクを追加」で同じカードに行を足し、ごみ箱で行を消す。最後の行を消すとカードも消える", async () => {
      mockApi({ entries: [dto()] });
      const ui = userEvent.setup();
      await renderForm();

      await ui.click(
        screen.getAllByRole("button", { name: /タスクを追加/ })[0],
      );
      expect(actualInputs()).toHaveLength(2);
      expect(projectCards()).toHaveLength(1);

      const trashButtons = () =>
        actualInputs().map(
          (input) =>
            within(input.closest("div.grid") as HTMLElement)
              .getAllByRole("button")
              .at(-1) as HTMLElement,
        );
      await ui.click(trashButtons()[1]);
      expect(actualInputs()).toHaveLength(1);
      await ui.click(trashButtons()[0]);
      expect(projectCards()).toHaveLength(0);
    });

    it("AC-effort-entry-13: カードの × で案件ごと消す", async () => {
      mockApi({
        entries: [
          dto(),
          dto({ task_name: "実装" }),
          dto({ project_name: "案件B" }),
        ],
      });
      const ui = userEvent.setup();
      await renderForm();
      expect(projectCards()).toHaveLength(2);

      await ui.click(projectCards()[0]);

      expect(projectCards()).toHaveLength(1);
      expect(actualInputs()).toHaveLength(1);
    });
  });

  describe("案件とタスクの欄", () => {
    const projects: ProjectWithTasks[] = [
      {
        id: 10,
        name: "既存の案件",
        created_at: "2026-10-01T00:00:00Z",
        tasks: [
          { id: 100, name: "既存のタスク", created_at: "2026-10-01T00:00:00Z" },
        ],
      },
    ];

    it('AC-effort-entry-14: 候補から案件を選べ、候補に無い名前は「"{名前}" を追加」で入れる', async () => {
      mockApi({ projects });
      const ui = userEvent.setup();
      await renderForm();
      await ui.click(
        screen.getByRole("button", { name: /工数エントリーを追加/ }),
      );

      await ui.click(screen.getByRole("button", { name: "案件" }));
      expect(
        await screen.findByRole("option", { name: "既存の案件" }),
      ).toBeInTheDocument();
      await ui.type(
        screen.getByPlaceholderText("案件を検索または入力..."),
        "新しい案件",
      );
      await ui.click(
        await screen.findByRole("button", { name: '"新しい案件" を追加' }),
      );

      expect(
        screen.getByRole("button", { name: "新しい案件" }),
      ).toBeInTheDocument();
    });

    it("AC-effort-entry-14: 案件を選ぶと、タスクの候補はその案件のタスクになる", async () => {
      mockApi({ projects });
      const ui = userEvent.setup();
      await renderForm();
      await ui.click(
        screen.getByRole("button", { name: /工数エントリーを追加/ }),
      );

      await ui.click(screen.getByRole("button", { name: "案件" }));
      await ui.click(await screen.findByRole("option", { name: "既存の案件" }));
      await ui.click(screen.getByRole("button", { name: "タスク" }));

      expect(
        await screen.findByRole("option", { name: "既存のタスク" }),
      ).toBeInTheDocument();
    });

    it("AC-effort-entry-14: 案件欄を変えると、そのカードのタスクの名前を空に戻す（見積と実績は残る）", async () => {
      mockApi({
        entries: [dto({ estimated_hours: 2, hours: 1.5 })],
        projects,
      });
      const ui = userEvent.setup();
      await renderForm();
      expect(screen.getByRole("button", { name: "設計" })).toBeInTheDocument();

      await ui.click(screen.getByRole("button", { name: "案件A" }));
      await ui.type(
        screen.getByPlaceholderText("案件を検索または入力..."),
        "B",
      );

      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "設計" }),
        ).not.toBeInTheDocument(),
      );
      expect(estimateInputs()[0]).toHaveValue(2);
      expect(actualInputs()[0]).toHaveValue(1.5);
    });

    it("AC-effort-entry-14: 候補の取得に失敗したら「案件の取得に失敗しました」", async () => {
      mockApi({ projects: "error" });
      await renderForm();

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith("案件の取得に失敗しました"),
      );
    });
  });

  describe("見積と実績、集計", () => {
    it("AC-effort-entry-15: 各行に「実績 − 見積」を出す（見積が空なら出さず、0 は ±0）", async () => {
      mockApi({
        entries: [
          dto({ task_name: "多い", estimated_hours: 2, hours: 2.5 }),
          dto({ task_name: "少ない", estimated_hours: 1, hours: 0.25 }),
          dto({ task_name: "同じ", estimated_hours: 1, hours: 1 }),
          dto({ task_name: "見積なし", hours: 3 }),
        ],
      });
      await renderForm();

      const badges = actualInputs().map(
        (input) =>
          (input.closest("div.grid") as HTMLElement).querySelector(
            '[data-slot="badge"]',
          )?.textContent ?? null,
      );
      expect(badges).toEqual(["+0.5", "-0.75", "±0", null]);
    });

    it("AC-effort-entry-15: 欄を空にすると、見積は「なし」、実績は未入力になる", async () => {
      mockApi({ entries: [dto({ estimated_hours: 2, hours: 1 })] });
      const ui = userEvent.setup();
      await renderForm();

      await ui.clear(estimateInputs()[0]);
      await ui.clear(actualInputs()[0]);

      expect(estimateInputs()[0]).toHaveValue(null);
      expect(actualInputs()[0]).toHaveValue(null);
    });

    it("AC-effort-entry-16: 案件ごとと全体の見積・実績・差分を出す。差分は見積のあるタスクだけで出す", async () => {
      mockApi({
        entries: [
          dto({
            project_name: "案件A",
            task_name: "設計",
            estimated_hours: 2,
            hours: 2.5,
          }),
          dto({ project_name: "案件A", task_name: "実装", hours: 1 }),
          dto({
            project_name: "案件B",
            task_name: "打合せ",
            estimated_hours: 1,
            hours: 0.33,
          }),
          dto({ project_name: "案件C", task_name: "調査", hours: 2 }),
        ],
      });
      await renderForm();

      expect(summaryRowText("案件A")).toMatch(
        /見積:2h.*実績:3.5h.*差分:.*\+0.5/,
      );
      expect(summaryRowText("案件B")).toMatch(
        /見積:1h.*実績:0.33h.*差分:.*-0.67/,
      );
      expect(summaryRowText("案件C")).toMatch(/見積:-.*実績:2h.*差分:-/);
      expect(totalsText()).toMatch(/見積合計3h.*実績合計5.83h.*差分.*-0.17/);
    });

    it("AC-effort-entry-16: 大文字小文字だけが違う打ち込みの案件は 1 行にまとめる", async () => {
      mockApi({
        entries: [
          dto({ project_name: "ABC", hours: 1 }),
          dto({ project_name: "abc", task_name: "実装", hours: 2 }),
        ],
      });
      await renderForm();

      const section = screen.getByText("案件別集計")
        .parentElement as HTMLElement;
      expect(section.textContent).toMatch(/実績:3h/);
    });
  });

  describe("検証と送信", () => {
    it("AC-effort-entry-17: 日付が無ければ「日付を選択してください。」を出し、確認を出さない", async () => {
      mockApi({ entries: [dto()], date: null });
      const ui = userEvent.setup();
      await renderForm();

      await ui.click(submitButton());

      expect(showErrorToast).toHaveBeenCalledWith("日付を選択してください。");
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("AC-effort-entry-17: 実績が未入力の行は「必須入力」を出して「入力内容を確認してください。」", async () => {
      mockApi({ entries: [dto()] });
      const ui = userEvent.setup();
      await renderForm();

      await ui.clear(actualInputs()[0]);
      await ui.click(submitButton());

      expect(screen.getByText("必須入力")).toBeInTheDocument();
      expect(showErrorToast).toHaveBeenCalledWith(
        "入力内容を確認してください。",
      );
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    it("AC-effort-entry-17: 案件とタスクの名前が無い行も「必須入力」。負の値はここでは止めない", async () => {
      mockApi({
        entries: [
          dto({ project_name: "", task_name: "" }),
          dto({ project_name: "案件B", hours: -1 }),
        ],
      });
      const ui = userEvent.setup();
      await renderForm();

      await ui.click(submitButton());

      expect(screen.getAllByText("必須入力")).toHaveLength(2);
    });

    it("AC-effort-entry-17 / 18: 検証が通れば確認を出し、「送信する」で送る。成功したらフォームを空に戻し、候補を取り直す", async () => {
      let release!: () => void;
      const submitDelay = new Promise<void>((resolve) => {
        release = resolve;
      });
      const log = mockApi({
        entries: [dto({ estimated_hours: 2, hours: 1.5 })],
        submitDelay,
      });
      const ui = userEvent.setup();
      await renderForm();
      const projectGetsBefore = log.projectGets;

      await ui.click(submitButton());
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveTextContent("工数を登録します");
      expect(dialog).toHaveTextContent(
        "よろしければ「送信する」をクリックしてください。",
      );
      await ui.click(within(dialog).getByRole("button", { name: "送信する" }));

      expect(
        await screen.findByRole("button", { name: "送信中..." }),
      ).toBeDisabled();
      release();
      await waitFor(() =>
        expect(showSuccessToast).toHaveBeenCalledWith("工数を登録しました。"),
      );
      expect(log.submitted).toEqual([
        {
          date: "2026-10-13",
          entries: [dto({ estimated_hours: 2, hours: 1.5 })],
          memo: null,
        },
      ]);
      expect(projectCards()).toHaveLength(0);
      expect(screen.getByText("日付を選択")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "元に戻す" })).toBeDisabled();
      await waitFor(() =>
        expect(log.projectGets).toBeGreaterThan(projectGetsBefore),
      );
    });

    it("AC-effort-entry-18: 失敗したら「工数の送信に失敗しました。」を出し、入力は残る", async () => {
      mockApi({ entries: [dto()], submit: "error" });
      const ui = userEvent.setup();
      await renderForm();

      await ui.click(submitButton());
      await ui.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", {
          name: "送信する",
        }),
      );

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "工数の送信に失敗しました。",
        ),
      );
      expect(projectCards()).toHaveLength(1);
      expect(submitButton()).toBeEnabled();
    });
  });

  describe("undo / redo", () => {
    it("AC-effort-entry-19: ボタンで 1 歩ずつ戻し、やり直す。新しい変更で redo は消える", async () => {
      mockApi();
      const ui = userEvent.setup();
      await renderForm();
      const memo = screen.getByPlaceholderText("自由にご入力ください");
      const undo = screen.getByRole("button", { name: "元に戻す" });
      const redo = screen.getByRole("button", { name: "やり直す" });

      await ui.type(memo, "ab");
      await ui.click(undo);
      expect(memo).toHaveValue("a");
      await ui.click(redo);
      expect(memo).toHaveValue("ab");
      await ui.click(undo);
      await ui.type(memo, "c");

      expect(memo).toHaveValue("ac");
      expect(redo).toBeDisabled();
    });

    it("AC-effort-entry-19: キーボードは入力欄の中でもフォーム全体の undo / redo になる（Ctrl+Z、Ctrl+Shift+Z、Ctrl+Y）", async () => {
      mockApi();
      const ui = userEvent.setup();
      await renderForm();
      const memo = screen.getByPlaceholderText("自由にご入力ください");
      await ui.click(
        screen.getByRole("button", { name: /工数エントリーを追加/ }),
      );
      await ui.type(memo, "x");

      await ui.keyboard("{Control>}z{/Control}");
      expect(memo).toHaveValue("");
      await ui.keyboard("{Control>}z{/Control}");
      expect(projectCards()).toHaveLength(0);

      await ui.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
      expect(projectCards()).toHaveLength(1);
      await ui.keyboard("{Control>}y{/Control}");
      expect(memo).toHaveValue("x");
    });
  });
});
