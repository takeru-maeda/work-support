import { describe, expect, it } from "vitest";

import { adminClient, callApi, createTestUser } from "./helpers";

import type { TestUser } from "./helpers";

// ユーザー設定（/api/user-settings。docs/specs/user-settings/spec.md）
interface Settings {
  id: number;
  notify_effort_email: boolean;
  updated_at: string;
}

async function settingsOf(res: Response, status: number): Promise<Settings> {
  expect(res.status, await res.clone().text()).toBe(status);
  return ((await res.json()) as { user_settings: Settings }).user_settings;
}

const get = (user: TestUser) => callApi("/api/user-settings", { user });
const post = (user: TestUser) =>
  callApi("/api/user-settings", { method: "POST", user, body: {} });
const put = (user: TestUser, body: unknown) =>
  callApi("/api/user-settings", { method: "PUT", user, body });

describe("/api/user-settings", () => {
  it("AC-user-settings-01: 行が無ければ GET は 404", async () => {
    const user = await createTestUser();
    const res = await get(user);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: "User settings not found",
      accessLogId: expect.any(Number),
    });
  });

  it("AC-user-settings-02: POST は行が無ければ通知を有効にして 201 で作り、あればその行を 200 で返す", async () => {
    const user = await createTestUser();

    const created = await settingsOf(await post(user), 201);
    expect(created).toEqual({
      id: expect.any(Number),
      notify_effort_email: true,
      updated_at: expect.any(String),
    });

    await put(user, { notifyEffortEmail: false });
    const existing = await settingsOf(await post(user), 200);
    expect(existing).toMatchObject({
      id: created.id,
      notify_effort_email: false,
    });
    expect(await settingsOf(await get(user), 200)).toMatchObject({
      id: created.id,
    });
  });

  it("AC-user-settings-03: PUT は値と updated_at を上書きする", async () => {
    const user = await createTestUser();
    const created = await settingsOf(await post(user), 201);

    const updated = await settingsOf(
      await put(user, { notifyEffortEmail: false }),
      200,
    );

    expect(updated).toMatchObject({
      id: created.id,
      notify_effort_email: false,
    });
    expect(Date.parse(updated.updated_at)).toBeGreaterThanOrEqual(
      Date.parse(created.updated_at),
    );
  });

  it("AC-user-settings-03: 行が無ければ PUT は 404 で、作らない", async () => {
    const user = await createTestUser();

    expect((await put(user, { notifyEffortEmail: false })).status).toBe(404);
    expect((await get(user)).status).toBe(404);
  });

  it.each([
    ["値が無い", {}],
    ["真偽値でない", { notifyEffortEmail: "false" }],
    ["スネークケース", { notify_effort_email: false }],
  ])("AC-user-settings-03: %s なら 400", async (_label, body) => {
    const user = await createTestUser();
    await post(user);

    const res = await put(user, body);

    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ success: false });
  });

  it("AC-user-settings-04 / INV-3: ほかのユーザーの行は読めず、変えられない", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await post(owner);

    expect((await get(other)).status).toBe(404);
    expect((await put(other, { notifyEffortEmail: false })).status).toBe(404);
    expect(await settingsOf(await get(owner), 200)).toMatchObject({
      notify_effort_email: true,
    });
  });

  it("AC-user-settings-04: 行はユーザーごとに 1 行", async () => {
    const user = await createTestUser();
    await post(user);
    await post(user);

    const { count, error } = await adminClient()
      .from("user_settings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    expect(count).toBe(1);
  });

  it.each(["GET", "POST", "PUT"] as const)(
    "AC-user-settings-04: トークンが無ければ %s は 401",
    async (method) => {
      const res = await callApi("/api/user-settings", {
        method,
        body: method === "GET" ? undefined : { notifyEffortEmail: true },
      });

      expect(res.status).toBe(401);
    },
  );
});
