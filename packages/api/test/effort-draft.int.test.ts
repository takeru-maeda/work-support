import { describe, expect, it } from "vitest";

import { callApi, createTestUser } from "./helpers";

import type { TestUser } from "./helpers";

// 工数登録の下書き（/api/effort/draft）。サーバーは clientUpdatedAt の新旧で上書きを決める
// （docs/specs/effort-draft/spec.md）
const ENTRY = {
  project_id: null,
  project_name: "案件A",
  task_id: null,
  task_name: "設計",
  estimated_hours: 2,
  hours: 1.5,
};

interface DraftBody {
  date?: string | null;
  entries?: unknown[];
  memo?: string | null;
  clientUpdatedAt: string;
}

function putDraft(user: TestUser, body: DraftBody) {
  return callApi("/api/effort/draft", {
    method: "PUT",
    user,
    body: { date: "2026-10-13", entries: [ENTRY], memo: null, ...body },
  });
}

async function getDraft(user: TestUser) {
  const res = await callApi("/api/effort/draft", { user });
  if (res.status === 204) return null;
  expect(res.status, await res.clone().text()).toBe(200);
  return ((await res.json()) as { draft: Record<string, unknown> }).draft;
}

describe("/api/effort/draft", () => {
  it("AC-effort-draft-01: 下書きが無ければ GET は 204", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/effort/draft", { user });

    expect(res.status).toBe(204);
  });

  it("AC-effort-draft-01 / 02: 下書きが無ければ PUT で作り、GET で保存した内容を返す", async () => {
    const user = await createTestUser();
    const res = await putDraft(user, {
      memo: "メモ",
      clientUpdatedAt: "2026-10-13T09:00:00+09:00",
    });

    expect(res.status, await res.clone().text()).toBe(200);
    expect(await res.json()).toEqual({
      applied: true,
      draft: {
        user_id: user.id,
        date: "2026-10-13",
        updated_at: expect.any(String),
      },
    });

    const draft = await getDraft(user);
    expect(draft).toEqual({
      entries: [ENTRY],
      memo: "メモ",
      date: "2026-10-13",
      updated_at: expect.any(String),
      client_updated_at: expect.any(String),
    });
    expect(Date.parse(draft?.client_updated_at as string)).toBe(
      Date.parse("2026-10-13T09:00:00+09:00"),
    );
  });

  it("AC-effort-draft-02 / INV-1: 保存済みより新しい clientUpdatedAt なら上書きする", async () => {
    const user = await createTestUser();
    await putDraft(user, {
      memo: "古い",
      clientUpdatedAt: "2026-10-13T00:00:00Z",
    });

    const res = await putDraft(user, {
      memo: "新しい",
      clientUpdatedAt: "2026-10-13T00:00:01Z",
    });

    expect(((await res.json()) as { applied: boolean }).applied).toBe(true);
    expect((await getDraft(user))?.memo).toBe("新しい");
  });

  it.each([
    ["同じ", "2026-10-13T00:00:00Z"],
    ["古い", "2026-10-12T23:59:59Z"],
  ])(
    "AC-effort-draft-02 / INV-1: 保存済みと%s clientUpdatedAt なら保存せずに applied: false",
    async (_label, clientUpdatedAt) => {
      const user = await createTestUser();
      await putDraft(user, {
        memo: "保存済み",
        clientUpdatedAt: "2026-10-13T00:00:00Z",
      });

      const res = await putDraft(user, {
        memo: "遅れて届いた",
        clientUpdatedAt,
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        applied: false,
        reason: "Stale clientUpdatedAt",
      });
      expect((await getDraft(user))?.memo).toBe("保存済み");
    },
  );

  it("AC-effort-draft-02: 下書きを消したあとは、古い clientUpdatedAt でも作り直す（INV-2 の守りは web の側だけ）", async () => {
    const user = await createTestUser();
    await putDraft(user, { clientUpdatedAt: "2026-10-13T00:00:00Z" });
    await callApi("/api/effort/draft", { method: "DELETE", user });

    const res = await putDraft(user, {
      memo: "古い保存",
      clientUpdatedAt: "2026-01-01T00:00:00Z",
    });

    expect(((await res.json()) as { applied: boolean }).applied).toBe(true);
    expect((await getDraft(user))?.memo).toBe("古い保存");
  });

  it("AC-effort-draft-03: 日付が null、エントリーが空、メモを省いた下書きも保存できる", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/effort/draft", {
      method: "PUT",
      user,
      body: {
        date: null,
        entries: [],
        clientUpdatedAt: "2026-10-13T00:00:00Z",
      },
    });

    expect(res.status, await res.clone().text()).toBe(200);
    expect(await getDraft(user)).toMatchObject({
      date: null,
      entries: [],
      memo: null,
    });
  });

  it.each([
    [
      "タイムゾーンの無い clientUpdatedAt",
      { clientUpdatedAt: "2026-10-13T00:00:00" },
    ],
    ["日付の形が違う", { date: "2026/10/13" }],
    ["実績の無いエントリー", { entries: [{ ...ENTRY, hours: undefined }] }],
    ["clientUpdatedAt が無い", { clientUpdatedAt: undefined }],
  ])("AC-effort-draft-03: %s は 400", async (_label, override) => {
    const user = await createTestUser();
    const res = await callApi("/api/effort/draft", {
      method: "PUT",
      user,
      body: {
        date: "2026-10-13",
        entries: [ENTRY],
        clientUpdatedAt: "2026-10-13T00:00:00Z",
        ...override,
      },
    });

    expect(res.status).toBe(400);
    expect(await getDraft(user)).toBeNull();
  });

  it("AC-effort-draft-04: DELETE は下書きを消して 204。無くても 204", async () => {
    const user = await createTestUser();
    await putDraft(user, { clientUpdatedAt: "2026-10-13T00:00:00Z" });

    const first = await callApi("/api/effort/draft", {
      method: "DELETE",
      user,
    });
    expect(first.status).toBe(204);
    expect(await getDraft(user)).toBeNull();

    const second = await callApi("/api/effort/draft", {
      method: "DELETE",
      user,
    });
    expect(second.status).toBe(204);
  });

  it("AC-effort-draft-05 / INV-4: 下書きはユーザーごとに 1 件で、他人の下書きは読めず消せない", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await putDraft(owner, {
      memo: "本人の下書き",
      clientUpdatedAt: "2026-10-13T00:00:00Z",
    });

    expect(await getDraft(other)).toBeNull();
    await callApi("/api/effort/draft", { method: "DELETE", user: other });
    await putDraft(other, {
      memo: "他人の下書き",
      clientUpdatedAt: "2026-10-13T00:00:01Z",
    });

    expect((await getDraft(owner))?.memo).toBe("本人の下書き");
    expect((await getDraft(other))?.memo).toBe("他人の下書き");
  });

  it.each(["GET", "PUT", "DELETE"] as const)(
    "AC-effort-draft-05: トークンが無ければ %s は 401",
    async (method) => {
      const res = await callApi("/api/effort/draft", {
        method,
        body:
          method === "PUT"
            ? {
                date: null,
                entries: [],
                clientUpdatedAt: "2026-10-13T00:00:00Z",
              }
            : undefined,
      });

      expect(res.status).toBe(401);
    },
  );
});
