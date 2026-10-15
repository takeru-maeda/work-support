import { describe, expect, it } from "vitest";

import { adminClient, callApi, createTestUser } from "./helpers";

import type { TestUser } from "./helpers";

// アカウントの削除（DELETE /api/users/me。docs/specs/profile/spec.md の AC-14、15、INV-3）。
// 画像のあるユーザーの削除は avatar-storage.int.test.ts で確かめる
const USER_TABLES = [
  "goals",
  "missions",
  "projects",
  "work_records",
  "user_settings",
  "work_entry_drafts",
] as const;

async function countRows(table: string, userId: string) {
  const { count, error } = await adminClient()
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

/** 各機能の API で、そのユーザーのデータを一通り作る */
async function seedEverything(user: TestUser) {
  const calls: [string, "POST" | "PUT", unknown][] = [
    [
      "/api/goals/periods",
      "POST",
      {
        start_date: "2026-10-01",
        end_date: "2026-12-31",
        goals: [{ title: "目標", content: "", weight: 100 }],
      },
    ],
    ["/api/missions", "PUT", { content: "ミッション" }],
    [
      "/api/effort/entries",
      "POST",
      {
        date: "2026-10-13",
        entries: [
          {
            project_id: null,
            project_name: "案件",
            task_id: null,
            task_name: "タスク",
            estimated_hours: null,
            hours: 1,
          },
        ],
      },
    ],
    ["/api/user-settings", "POST", {}],
    [
      "/api/effort/draft",
      "PUT",
      { date: null, entries: [], clientUpdatedAt: "2026-10-13T00:00:00Z" },
    ],
  ];
  for (const [path, method, body] of calls) {
    const res = await callApi(path, { method, user, body });
    expect(res.status, `${path}: ${await res.clone().text()}`).toBeLessThan(
      300,
    );
  }
  const created = await callApi("/api/goals/current", { user });
  const { goals } = (await created.json()) as { goals: { id: number }[] };
  const updated = await callApi(`/api/goals/${goals[0].id}`, {
    method: "PUT",
    user,
    body: { progress: 10 },
  });
  expect(updated.status).toBe(200);
  return goals[0].id;
}

describe("DELETE /api/users/me", () => {
  it("AC-profile-14 / 15 / INV-3: 画像の無いユーザーを消すと 204 で、各機能のデータが CASCADE で消える", async () => {
    const user = await createTestUser();
    const goalId = await seedEverything(user);
    for (const table of USER_TABLES) {
      expect(await countRows(table, user.id), table).toBeGreaterThan(0);
    }

    const res = await callApi("/api/users/me", { method: "DELETE", user });

    expect(res.status, await res.clone().text()).toBe(204);
    const { data } = await adminClient().auth.admin.getUserById(user.id);
    expect(data.user).toBeNull();
    for (const table of USER_TABLES) {
      expect(await countRows(table, user.id), table).toBe(0);
    }
    const histories = await adminClient()
      .from("goal_progress_histories")
      .select("id")
      .eq("goal_id", goalId);
    expect(histories.data).toEqual([]);
  });

  it("AC-profile-15: アクセスログは user_id が NULL になって残る", async () => {
    const user = await createTestUser();
    await callApi("/api/missions", { user });
    const before = await adminClient()
      .from("access_logs")
      .select("id")
      .eq("user_id", user.id);
    const ids = (before.data ?? []).map((row: { id: number }) => row.id);
    expect(ids.length).toBeGreaterThan(0);

    await callApi("/api/users/me", { method: "DELETE", user });

    const after = await adminClient()
      .from("access_logs")
      .select("id, user_id")
      .in("id", ids);
    expect(after.data).toHaveLength(ids.length);
    expect(after.data?.every((row) => row.user_id === null)).toBe(true);
  });

  it("AC-profile-15: ほかのユーザーのデータは消えない", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    await seedEverything(other);

    await callApi("/api/users/me", { method: "DELETE", user });

    for (const table of USER_TABLES) {
      expect(await countRows(table, other.id), table).toBeGreaterThan(0);
    }
  });

  it("AC-profile-14: トークンが無ければ 401", async () => {
    expect((await callApi("/api/users/me", { method: "DELETE" })).status).toBe(
      401,
    );
  });
});
