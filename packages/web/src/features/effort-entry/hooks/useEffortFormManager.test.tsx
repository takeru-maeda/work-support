import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import type { EffortEntry } from "@/features/effort-entry/types";
import type { AuthUser } from "@/lib/auth";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { renderHookWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type { EffortDraft, EffortDraftResponse } from "@shared/schemas/effort";

import { useEffortFormManager } from "./useEffortFormManager";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

// 下書きの保存は本物のタイマー（800 ミリ秒）で待つので、1 件で数秒かかる。ほかのファイルと並べて回すと
// 既定の 5 秒を超えることがあるため、上限を広げる
vi.setConfig({ testTimeout: 15_000 });

/** サーバーへの保存を待つ時間（800 ミリ秒）より十分に長い時間 */
const AFTER_SYNC_DELAY_MS = 1200;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

let user: AuthUser;
let storageKey: string;

/** テストの中で、API に届いたリクエストを記録する */
interface ApiLog {
  puts: EffortDraft[];
  deletes: number;
  entries: unknown[];
  errorLogs: unknown[];
}

interface ApiOptions {
  /** GET /api/effort/draft の応答。null なら 204、"error" なら 500 */
  draft?: EffortDraftResponse["draft"] | null | "error";
  /** GET /api/effort/draft の応答を遅らせる（読み込み中を確かめるとき） */
  draftDelay?: Promise<void>;
  /** PUT /api/effort/draft の応答 */
  put?: "applied" | "stale" | "error";
  /** POST /api/effort/entries の応答 */
  submit?: "ok" | "error";
  /** POST /api/effort/entries の応答を遅らせるミリ秒 */
  submitDelayMs?: number;
}

const mockApi = ({
  draft = null,
  draftDelay,
  put = "applied",
  submit = "ok",
  submitDelayMs = 0,
}: ApiOptions = {}): ApiLog => {
  const log: ApiLog = { puts: [], deletes: 0, entries: [], errorLogs: [] };
  server.use(
    http.get(apiUrl(API_ENDPOINTS.effortDraft), async () => {
      await draftDelay;
      if (draft === "error") return new HttpResponse(null, { status: 500 });
      if (draft === null) return new HttpResponse(null, { status: 204 });
      return HttpResponse.json<EffortDraftResponse>({ draft });
    }),
    http.put(apiUrl(API_ENDPOINTS.effortDraft), async ({ request }) => {
      log.puts.push((await request.json()) as EffortDraft);
      if (put === "error") return new HttpResponse(null, { status: 500 });
      if (put === "stale") {
        return HttpResponse.json({
          applied: false,
          reason: "Stale clientUpdatedAt",
        });
      }
      return HttpResponse.json({
        applied: true,
        draft: {
          user_id: user.id,
          date: null,
          updated_at: "2026-10-13T00:00:00Z",
        },
      });
    }),
    http.delete(apiUrl(API_ENDPOINTS.effortDraft), () => {
      log.deletes += 1;
      return new HttpResponse(null, { status: 204 });
    }),
    http.post(apiUrl(API_ENDPOINTS.effortEntries), async ({ request }) => {
      log.entries.push(await request.json());
      await sleep(submitDelayMs);
      if (submit === "error") return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ saved: [] }, { status: 201 });
    }),
    http.get(apiUrl(API_ENDPOINTS.projects), () =>
      HttpResponse.json({ projects: [] }),
    ),
    http.post(apiUrl(API_ENDPOINTS.errorLogs), async ({ request }) => {
      log.errorLogs.push(await request.json());
      return HttpResponse.json(
        { id: 1, recordedAt: "2026-10-13T00:00:00Z" },
        { status: 201 },
      );
    }),
  );
  return log;
};

/** フォームを描画し、下書きの読み込みが終わるまで待つ */
const renderManager = async () => {
  const view = renderHookWithProviders(() => useEffortFormManager());
  await waitFor(() => expect(view.result.current.isInitializing).toBe(false));
  return view;
};

const readLocalDraft = () => {
  const raw = window.localStorage.getItem(storageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
};

const formEntry = (overrides: Partial<EffortEntry> = {}): EffortEntry => ({
  id: "entry-1",
  projectGroupId: "group-1",
  projectId: null,
  projectName: "案件A",
  taskId: null,
  taskName: "設計",
  estimatedHours: 2,
  actualHours: 1.5,
  ...overrides,
});

const serverDraft = (
  memo: string,
  clientUpdatedAt: string,
): EffortDraftResponse["draft"] => ({
  entries: [
    {
      project_id: null,
      project_name: "案件A",
      task_id: null,
      task_name: "設計",
      estimated_hours: 2,
      hours: 1.5,
    },
  ],
  memo,
  date: "2026-10-13",
  updated_at: clientUpdatedAt,
  client_updated_at: clientUpdatedAt,
});

const persistLocal = (memo: string, clientUpdatedAt?: string) => {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      date: "2026-10-13",
      memo,
      entries: [formEntry()],
      ...(clientUpdatedAt ? { clientUpdatedAt } : {}),
    }),
  );
};

beforeEach(() => {
  user = signInTestUser();
  storageKey = `effort:entry:form_${user.id}`;
  window.localStorage.clear();
  vi.mocked(showErrorToast).mockClear();
  vi.mocked(showSuccessToast).mockClear();
});

describe("useEffortFormManager の下書き", () => {
  describe("保存", () => {
    it("AC-effort-draft-06: 変更のたびにブラウザへすぐ保存し、サーバーには最後の変更から 800 ミリ秒後に 1 回だけ PUT する", async () => {
      const log = mockApi();
      const { result } = await renderManager();

      act(() => result.current.setMemo("あ"));
      expect(readLocalDraft()).toMatchObject({ memo: "あ" });
      await sleep(400);
      act(() => result.current.setMemo("あい"));
      expect(readLocalDraft()).toMatchObject({ memo: "あい" });
      await sleep(400);
      act(() => result.current.setMemo("あいう"));

      // 最初の変更から 800 ミリ秒たっても、変更が続いている間は送らない
      expect(log.puts).toHaveLength(0);
      await waitFor(() => expect(log.puts).toHaveLength(1));
      expect(log.puts[0]).toMatchObject({
        date: null,
        entries: [],
        memo: "あいう",
      });
      expect(log.puts[0].clientUpdatedAt).toMatch(/Z$/);

      await sleep(AFTER_SYNC_DELAY_MS);
      expect(log.puts).toHaveLength(1);
    });

    it("AC-effort-draft-06: undo で戻した内容も保存する", async () => {
      const log = mockApi();
      const { result } = await renderManager();

      act(() => result.current.setMemo("一つ目"));
      act(() => result.current.setMemo("二つ目"));
      act(() => result.current.undo());

      await waitFor(() => expect(log.puts).toHaveLength(1));
      expect(log.puts[0].memo).toBe("一つ目");
      expect(readLocalDraft()).toMatchObject({ memo: "一つ目" });
    });

    it("AC-effort-draft-06: エントリーはサーバーの形にして送る", async () => {
      const log = mockApi();
      const { result } = await renderManager();

      act(() => result.current.setDate(new Date(2026, 9, 13)));
      act(() => result.current.addEntry(formEntry()));

      await waitFor(() => expect(log.puts).toHaveLength(1));
      expect(log.puts[0]).toMatchObject({
        date: "2026-10-13",
        entries: [
          {
            project_id: null,
            project_name: "案件A",
            task_id: null,
            task_name: "設計",
            estimated_hours: 2,
            hours: 1.5,
          },
        ],
        memo: null,
      });
    });

    it("AC-effort-draft-07 / INV-3: 空のフォームはサーバーに保存せず、ブラウザの下書きも消す", async () => {
      const log = mockApi();
      const { result } = await renderManager();

      act(() => result.current.setMemo("あ"));
      expect(readLocalDraft()).not.toBeNull();
      act(() => result.current.setMemo("   "));

      expect(readLocalDraft()).toBeNull();
      await sleep(AFTER_SYNC_DELAY_MS);
      expect(log.puts).toHaveLength(0);
    });

    it("AC-effort-draft-07: 日付だけを選んだ状態は保存する", async () => {
      const log = mockApi();
      const { result } = await renderManager();

      act(() => result.current.setDate(new Date(2026, 9, 13)));

      await waitFor(() => expect(log.puts).toHaveLength(1));
      expect(log.puts[0]).toMatchObject({
        date: "2026-10-13",
        entries: [],
        memo: null,
      });
    });

    it("AC-effort-draft-14: サーバーへの保存に失敗したら「ドラフトの保存に失敗しました。」を出す", async () => {
      const log = mockApi({ put: "error" });
      const { result } = await renderManager();

      act(() => result.current.setMemo("あ"));

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "ドラフトの保存に失敗しました。",
        ),
      );
      expect(log.puts).toHaveLength(1);
    });

    it("AC-effort-draft-14: 古いとして捨てられた（applied: false）ときは何も出さない", async () => {
      const log = mockApi({ put: "stale" });
      const { result } = await renderManager();

      act(() => result.current.setMemo("あ"));

      await waitFor(() => expect(log.puts).toHaveLength(1));
      await sleep(100);
      expect(showErrorToast).not.toHaveBeenCalled();
    });
  });

  describe("読み込みと復元", () => {
    it("AC-effort-draft-08: サーバーの下書きの取得が終わるまでは読み込み中で、送信できない", async () => {
      let release!: () => void;
      const draftDelay = new Promise<void>((resolve) => {
        release = resolve;
      });
      mockApi({
        draft: serverDraft("サーバー", "2026-10-13T00:00:00Z"),
        draftDelay,
      });
      const { result } = renderHookWithProviders(() => useEffortFormManager());

      await sleep(100);
      expect(result.current.isInitializing).toBe(true);
      expect(result.current.canSubmit).toBe(false);

      release();
      await waitFor(() => expect(result.current.isInitializing).toBe(false));
      expect(result.current.canSubmit).toBe(true);
    });

    it("AC-effort-draft-09: サーバーにだけ下書きがあれば、その内容で始める", async () => {
      mockApi({ draft: serverDraft("サーバー", "2026-10-13T00:00:00Z") });
      const { result } = await renderManager();

      expect(result.current.formData.memo).toBe("サーバー");
      expect(result.current.formData.entries).toEqual([
        expect.objectContaining({
          projectName: "案件A",
          taskName: "設計",
          estimatedHours: 2,
          actualHours: 1.5,
        }),
      ]);
      expect(result.current.formData.date?.getDate()).toBe(13);
    });

    it.each([
      ["ブラウザが新しい", "2026-10-13T00:00:01Z", "ブラウザ"],
      ["サーバーが新しい", "2026-10-12T23:59:59Z", "サーバー"],
      ["同じ時刻", "2026-10-13T00:00:00Z", "サーバー"],
      ["ブラウザの時刻が無い", undefined, "サーバー"],
    ])(
      "AC-effort-draft-09: 両方にあり、%s なら「%s」の内容で始める",
      async (_label, localTime, expected) => {
        persistLocal("ブラウザ", localTime);
        mockApi({ draft: serverDraft("サーバー", "2026-10-13T00:00:00Z") });
        const { result } = await renderManager();

        expect(result.current.formData.memo).toBe(expected);
      },
    );

    it("AC-effort-draft-10: ブラウザにだけ下書きがあり、サーバーが 204 なら、ブラウザの下書きを消して空から始める", async () => {
      persistLocal("ブラウザ", "2026-10-13T00:00:00Z");
      mockApi({ draft: null });
      const { result } = await renderManager();

      expect(result.current.formData).toEqual({
        date: null,
        entries: [],
        memo: "",
      });
      expect(readLocalDraft()).toBeNull();
    });

    it("AC-effort-draft-11: サーバーの取得に失敗したら、トーストを出してブラウザの下書きで始める", async () => {
      persistLocal("ブラウザ", "2026-10-13T00:00:00Z");
      mockApi({ draft: "error" });
      const { result } = await renderManager();

      expect(result.current.formData.memo).toBe("ブラウザ");
      expect(showErrorToast).toHaveBeenCalledWith("下書きの取得に失敗しました");
    });

    it("AC-effort-draft-11: ブラウザの下書きが壊れた JSON なら、黙って消して error_logs に送る", async () => {
      window.localStorage.setItem(storageKey, "{壊れた");
      const log = mockApi({ draft: null });
      const { result } = await renderManager();

      expect(result.current.formData.memo).toBe("");
      expect(window.localStorage.getItem(storageKey)).toBeNull();
      await waitFor(() => expect(log.errorLogs).toHaveLength(1));
      expect(showErrorToast).not.toHaveBeenCalled();
    });
  });

  describe("登録", () => {
    it("AC-effort-draft-12 / INV-2: 登録が成功したら、待っている保存を送らずに DELETE を 1 回送り、フォームと undo とブラウザの下書きを空にする", async () => {
      // 送信の応答を、保存を待つ時間（800 ミリ秒）より遅らせる。送信の最初に保存を取り消していないと、
      // 応答を待つ間に、登録する内容の下書きがサーバーに届く
      const log = mockApi({ submitDelayMs: AFTER_SYNC_DELAY_MS });
      const { result } = await renderManager();
      act(() => result.current.setDate(new Date(2026, 9, 13)));
      act(() => result.current.addEntry(formEntry()));
      expect(readLocalDraft()).not.toBeNull();

      await act(() => result.current.handleSubmit());

      expect(log.entries).toHaveLength(1);
      expect(log.deletes).toBe(1);
      expect(result.current.formData).toEqual({
        date: null,
        entries: [],
        memo: "",
      });
      expect(result.current.canUndo).toBe(false);
      expect(readLocalDraft()).toBeNull();
      expect(showSuccessToast).toHaveBeenCalledWith("工数を登録しました。");

      await sleep(AFTER_SYNC_DELAY_MS);
      expect(log.puts).toHaveLength(0);
    });

    it("AC-effort-draft-12: サーバーの下書きの削除に失敗しても利用者には知らせず、error_logs に送る", async () => {
      const log = mockApi();
      server.use(
        http.delete(apiUrl(API_ENDPOINTS.effortDraft), () => {
          log.deletes += 1;
          return new HttpResponse(null, { status: 500 });
        }),
      );
      const { result } = await renderManager();
      act(() => result.current.setDate(new Date(2026, 9, 13)));
      act(() => result.current.addEntry(formEntry()));

      await act(() => result.current.handleSubmit());

      expect(log.deletes).toBe(1);
      expect(result.current.formData.entries).toEqual([]);
      await waitFor(() => expect(log.errorLogs).toHaveLength(1));
      expect(showErrorToast).not.toHaveBeenCalled();
    });

    it("AC-effort-draft-13: 登録に失敗したら「工数の送信に失敗しました。」を出し、入力とブラウザの下書きは残る", async () => {
      const log = mockApi({ submit: "error" });
      const { result } = await renderManager();
      act(() => result.current.setDate(new Date(2026, 9, 13)));
      act(() => result.current.addEntry(formEntry()));

      await act(() => result.current.handleSubmit());

      expect(showErrorToast).toHaveBeenCalledWith("工数の送信に失敗しました。");
      expect(result.current.formData.entries).toHaveLength(1);
      expect(readLocalDraft()).toMatchObject({ date: "2026-10-13" });
      expect(log.deletes).toBe(0);
      // 送信の直前に取り消した保存は、次に編集するまで送り直さない
      await sleep(AFTER_SYNC_DELAY_MS);
      expect(log.puts).toHaveLength(0);
    });
  });
});
