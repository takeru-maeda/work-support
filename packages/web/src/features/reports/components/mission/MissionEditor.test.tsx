import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import type { AuthUser } from "@/lib/auth";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type { MissionGetResponse } from "@shared/schemas/missions";

import { MissionEditor } from "./MissionEditor";

vi.mock("@/lib/toast", () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

/** 保存中の状態はページが持つ（見出しの横のスピナー）。テストではその状態を画面に出して確かめる */
const Harness = () => {
  const [saving, setSaving] = useState(false);
  return (
    <>
      {saving && <p>ページの保存中の表示</p>}
      <MissionEditor saving={saving} setSaving={setSaving} />
    </>
  );
};

let user: AuthUser;

const missionOf = (content: string | null) => ({
  id: 1,
  user_id: user.id,
  content,
  updated_at: "2026-10-13T00:00:00+00:00",
});

interface ApiOptions {
  /** GET の応答。"error" なら 500 */
  get?: string | null | "error";
  /** PUT の応答。"error" なら 500 */
  put?: "ok" | "error";
  putDelay?: Promise<void>;
}

interface ApiLog {
  gets: number;
  puts: unknown[];
}

const mockApi = ({
  get = "旧",
  put = "ok",
  putDelay,
}: ApiOptions = {}): ApiLog => {
  const log: ApiLog = { gets: 0, puts: [] };
  server.use(
    http.get(apiUrl(API_ENDPOINTS.missions), () => {
      log.gets += 1;
      if (get === "error") {
        return HttpResponse.json(
          { error: "Internal Server Error" },
          { status: 500 },
        );
      }
      return HttpResponse.json<MissionGetResponse>({
        mission: get === null ? null : missionOf(get),
      });
    }),
    http.put(apiUrl(API_ENDPOINTS.missions), async ({ request }) => {
      const body = (await request.json()) as { content: string };
      log.puts.push(body);
      await putDelay;
      if (put === "error") return new HttpResponse(null, { status: 500 });
      return HttpResponse.json({ mission: missionOf(body.content) });
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

const textarea = () =>
  screen.getByPlaceholderText("ミッションを入力してください...");
const saveButton = () => screen.getByRole("button", { name: /保存/ });

const startEditing = async (ui: ReturnType<typeof userEvent.setup>) => {
  await ui.click(await screen.findByRole("button", { name: "編集" }));
};

beforeEach(() => {
  user = signInTestUser();
  vi.mocked(showErrorToast).mockClear();
  vi.mocked(showSuccessToast).mockClear();
});

describe("MissionEditor", () => {
  describe("表示", () => {
    it("AC-missions-04: 取得中は 3 行の読み込み中の表示を出し、取得したら改行を残して表示する", async () => {
      mockApi({ get: "一行目\n二行目" });
      const { container } = renderWithProviders(<Harness />);

      expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(
        3,
      );
      const text = await screen.findByText(/一行目/);
      expect(text.textContent).toBe("一行目\n二行目");
      expect(text).toHaveClass("whitespace-pre-line");
    });

    it.each([
      ["ミッションが無い", null],
      ["内容が NULL", "NULL"],
    ])("AC-missions-04: %sなら、未設定の案内を出す", async (_label, kind) => {
      if (kind === null) {
        mockApi({ get: null });
      } else {
        server.use(
          http.get(apiUrl(API_ENDPOINTS.missions), () =>
            HttpResponse.json<MissionGetResponse>({
              mission: missionOf(null),
            }),
          ),
        );
      }
      renderWithProviders(<Harness />);

      expect(
        await screen.findByText("まだミッションが設定されていません。"),
      ).toBeInTheDocument();
    });
  });

  describe("編集", () => {
    it("AC-missions-05: 「編集」で今の内容を入れた入力欄と「キャンセル」「保存」を出す", async () => {
      mockApi({ get: "今の内容" });
      const ui = userEvent.setup();
      renderWithProviders(<Harness />);

      await startEditing(ui);

      expect(textarea()).toHaveValue("今の内容");
      expect(
        screen.getByRole("button", { name: "キャンセル" }),
      ).toBeInTheDocument();
      expect(saveButton()).toBeInTheDocument();
    });

    it.each([
      ["内容が変わっていない", "旧"],
      ["空", ""],
      ["空白だけ", "   "],
      ["前後の空白を除くと保存済みと同じ", "  旧  "],
    ])("AC-missions-05: %sなら保存できない", async (_label, value) => {
      mockApi({ get: "旧" });
      const ui = userEvent.setup();
      renderWithProviders(<Harness />);

      await startEditing(ui);
      await ui.clear(textarea());
      if (value) await ui.type(textarea(), value);

      expect(saveButton()).toBeDisabled();
    });

    it("AC-missions-05: 「キャンセル」で取得している内容に戻して閉じる", async () => {
      mockApi({ get: "旧" });
      const ui = userEvent.setup();
      renderWithProviders(<Harness />);

      await startEditing(ui);
      await ui.type(textarea(), "の追記");
      await ui.click(screen.getByRole("button", { name: "キャンセル" }));

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("旧")).toBeInTheDocument();
      await startEditing(ui);
      expect(textarea()).toHaveValue("旧");
    });
  });

  describe("保存", () => {
    it("AC-missions-06: 前後の空白を除いた内容を送り、成功したらトーストを出して閉じ、取り直さずに表示を変える", async () => {
      const log = mockApi({ get: "旧" });
      const ui = userEvent.setup();
      renderWithProviders(<Harness />);

      await startEditing(ui);
      await ui.clear(textarea());
      await ui.type(textarea(), "  新しいミッション  ");
      await ui.click(saveButton());

      expect(await screen.findByText("新しいミッション")).toBeInTheDocument();
      expect(log.puts).toEqual([{ content: "新しいミッション" }]);
      expect(showSuccessToast).toHaveBeenCalledWith("ミッションを更新しました");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(log.gets).toBe(1);
    });

    it("AC-missions-06: 待っている間は「保存中...」で押せず、ページの保存中の表示を出す。入力欄は操作できる", async () => {
      let release!: () => void;
      const putDelay = new Promise<void>((resolve) => {
        release = resolve;
      });
      mockApi({ get: "旧", putDelay });
      const ui = userEvent.setup();
      renderWithProviders(<Harness />);

      await startEditing(ui);
      await ui.type(textarea(), "の追記");
      await ui.click(saveButton());

      expect(
        await screen.findByRole("button", { name: "保存中..." }),
      ).toBeDisabled();
      expect(screen.getByText("ページの保存中の表示")).toBeInTheDocument();
      expect(textarea()).toBeEnabled();
      release();
      await waitFor(() =>
        expect(
          screen.queryByText("ページの保存中の表示"),
        ).not.toBeInTheDocument(),
      );
    });

    it("AC-missions-06: 失敗したら「ミッションの更新に失敗しました」を出し、編集中の内容を残す", async () => {
      mockApi({ get: "旧", put: "error" });
      const ui = userEvent.setup();
      renderWithProviders(<Harness />);

      await startEditing(ui);
      await ui.type(textarea(), "の追記");
      await ui.click(saveButton());

      await waitFor(() =>
        expect(showErrorToast).toHaveBeenCalledWith(
          "ミッションの更新に失敗しました",
        ),
      );
      expect(textarea()).toHaveValue("旧の追記");
    });
  });

  describe("取得の失敗", () => {
    it("AC-missions-07: 「編集」の代わりにエラーの文と「再読み込み」を出し、「再読み込み」で取り直す", async () => {
      const log = mockApi({ get: "error" });
      const ui = userEvent.setup();
      renderWithProviders(<Harness />);

      await ui.click(await screen.findByRole("button", { name: "再読み込み" }));

      expect(
        screen.getByText("Request failed with status code 500"),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "編集" }),
      ).not.toBeInTheDocument();
      await waitFor(() => expect(log.gets).toBe(2));
    });
  });
});
