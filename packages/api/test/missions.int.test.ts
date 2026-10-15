import { describe, expect, it } from "vitest";

import { adminClient, callApi, createTestUser } from "./helpers";

import type { TestUser } from "./helpers";

// ミッション（/api/missions。docs/specs/missions/spec.md）
interface Mission {
  id: number;
  user_id: string;
  content: string | null;
  updated_at: string;
}

async function getMission(user: TestUser): Promise<Mission | null> {
  const res = await callApi("/api/missions", { user });
  expect(res.status, await res.clone().text()).toBe(200);
  return ((await res.json()) as { mission: Mission | null }).mission;
}

function putMission(user: TestUser, body: unknown) {
  return callApi("/api/missions", { method: "PUT", user, body });
}

async function rowCount(user: TestUser) {
  const { count, error } = await adminClient()
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  return count;
}

describe("/api/missions", () => {
  it("AC-missions-01: ミッションが無ければ { mission: null }", async () => {
    const user = await createTestUser();

    expect(await getMission(user)).toBeNull();
  });

  it("AC-missions-02: PUT は無ければ作り、あれば上書きして updated_at を進める。どちらも 200 で、1 ユーザー 1 件", async () => {
    const user = await createTestUser();

    const created = await putMission(user, { content: "最初" });
    expect(created.status, await created.clone().text()).toBe(200);
    const first = ((await created.json()) as { mission: Mission }).mission;
    expect(first).toMatchObject({ user_id: user.id, content: "最初" });

    const updated = await putMission(user, { content: "次" });
    expect(updated.status).toBe(200);
    const second = ((await updated.json()) as { mission: Mission }).mission;
    expect(second).toMatchObject({ id: first.id, content: "次" });
    expect(Date.parse(second.updated_at)).toBeGreaterThanOrEqual(
      Date.parse(first.updated_at),
    );

    expect(await getMission(user)).toMatchObject({ content: "次" });
    expect(await rowCount(user)).toBe(1);
  });

  it("AC-missions-02: 前後の空白は除かず、空白だけでも受け付ける", async () => {
    const user = await createTestUser();

    expect((await putMission(user, { content: "  前後  " })).status).toBe(200);
    expect((await getMission(user))?.content).toBe("  前後  ");
    expect((await putMission(user, { content: "   " })).status).toBe(200);
  });

  it.each([
    ["空文字", { content: "" }],
    ["content が無い", {}],
    ["文字列でない", { content: 1 }],
  ])("AC-missions-02: %s は 400", async (_label, body) => {
    const user = await createTestUser();

    expect((await putMission(user, body)).status).toBe(400);
    expect(await getMission(user)).toBeNull();
  });

  it("AC-missions-03: ほかのユーザーのミッションは読めず、上書きもしない", async () => {
    const owner = await createTestUser();
    const other = await createTestUser();
    await putMission(owner, { content: "本人のミッション" });

    expect(await getMission(other)).toBeNull();
    await putMission(other, { content: "他人のミッション" });

    expect((await getMission(owner))?.content).toBe("本人のミッション");
    expect((await getMission(other))?.content).toBe("他人のミッション");
  });

  it.each(["GET", "PUT"] as const)(
    "AC-missions-01: トークンが無ければ %s は 401",
    async (method) => {
      const res = await callApi("/api/missions", {
        method,
        body: method === "PUT" ? { content: "x" } : undefined,
      });

      expect(res.status).toBe(401);
    },
  );
});
