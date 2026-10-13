import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { useState } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { API_ENDPOINTS } from "@/config/api";
import type { AuthUser } from "@/lib/auth";
import { renderWithProviders, signInTestUser } from "@/test/render";
import { apiUrl, server } from "@/test/server";
import type { MissionGetResponse } from "@shared/schemas/missions";

import { MissionEditor } from "./MissionEditor";

const Harness = () => {
  const [saving, setSaving] = useState(false);
  return <MissionEditor saving={saving} setSaving={setSaving} />;
};

let user: AuthUser;

const missionOf = (content: string | null) => ({
  id: 1,
  user_id: user.id,
  content,
  updated_at: "2026-10-13T00:00:00+00:00",
});

beforeEach(() => {
  user = signInTestUser();
});

describe("MissionEditor", () => {
  it("取得したミッションを表示する", async () => {
    server.use(
      http.get(apiUrl(API_ENDPOINTS.missions), () =>
        HttpResponse.json<MissionGetResponse>({
          mission: missionOf("顧客の業務を速くする"),
        }),
      ),
    );
    renderWithProviders(<Harness />);
    expect(await screen.findByText("顧客の業務を速くする")).toBeInTheDocument();
  });

  it("未設定なら、未設定の案内を表示する", async () => {
    server.use(
      http.get(apiUrl(API_ENDPOINTS.missions), () =>
        HttpResponse.json<MissionGetResponse>({ mission: null }),
      ),
    );
    renderWithProviders(<Harness />);
    expect(
      await screen.findByText("まだミッションが設定されていません。"),
    ).toBeInTheDocument();
  });

  it("編集して保存すると、前後の空白を除いた内容を送り、表示を更新する", async () => {
    let sentBody: unknown;
    server.use(
      http.get(apiUrl(API_ENDPOINTS.missions), () =>
        HttpResponse.json<MissionGetResponse>({ mission: missionOf("旧") }),
      ),
      http.put(apiUrl(API_ENDPOINTS.missions), async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ mission: missionOf("新しいミッション") });
      }),
    );
    const ui = userEvent.setup();
    renderWithProviders(<Harness />);

    await ui.click(await screen.findByRole("button", { name: "編集" }));
    const textarea =
      screen.getByPlaceholderText("ミッションを入力してください...");
    await ui.clear(textarea);
    await ui.type(textarea, "  新しいミッション  ");
    await ui.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("新しいミッション")).toBeInTheDocument();
    expect(sentBody).toEqual({ content: "新しいミッション" });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("内容が変わっていないときは保存できない", async () => {
    server.use(
      http.get(apiUrl(API_ENDPOINTS.missions), () =>
        HttpResponse.json<MissionGetResponse>({ mission: missionOf("同じ") }),
      ),
    );
    const ui = userEvent.setup();
    renderWithProviders(<Harness />);

    await ui.click(await screen.findByRole("button", { name: "編集" }));
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });

  it("取得に失敗したら、編集のボタンの代わりに再読み込みのボタンを出す", async () => {
    server.use(
      http.get(apiUrl(API_ENDPOINTS.missions), () =>
        HttpResponse.json({ error: "Internal Server Error" }, { status: 500 }),
      ),
    );
    renderWithProviders(<Harness />);

    expect(
      await screen.findByRole("button", { name: "再読み込み" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "編集" }),
    ).not.toBeInTheDocument();
  });
});
