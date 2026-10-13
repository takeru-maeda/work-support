import { describe, expect, inject, it } from "vitest";

import { callApi, createTestUser } from "./helpers";
import { signHs256 } from "./tokens";

/**
 * マイグレーションからまっさらな DB を作り、登録したばかりのユーザーで主な API を通す。
 * スキーマが本番と同じでも、まっさらな DB で動くとは限らない（H-010: マテリアライズドビューが未更新のまま作られ、
 * 案件の一覧が 500 になった）。
 */
describe("登録したばかりのユーザー", () => {
  it.each([
    "/api/projects",
    "/api/goals/current",
    "/api/missions",
    "/api/user-settings",
    "/api/effort/draft",
  ])("GET %s が 500 にならない", async (path) => {
    const user = await createTestUser();
    const res = await callApi(path, { user });
    expect(res.status, await res.clone().text()).toBeLessThan(500);
  });

  it("案件の一覧は空で返る（工数を一度も登録していなくても）", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/projects", { user });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ projects: [] });
  });

  it("工数を登録すると、新しい案件とタスクが案件の一覧に出る", async () => {
    const user = await createTestUser();
    const saved = await callApi("/api/effort/entries", {
      method: "POST",
      user,
      body: {
        date: "2026-10-13",
        entries: [
          {
            project_id: null,
            project_name: "テスト案件",
            task_id: null,
            task_name: "テストタスク",
            estimated_hours: 2,
            hours: 1.5,
          },
        ],
        memo: null,
      },
    });
    expect(saved.status, await saved.clone().text()).toBe(201);

    const res = await callApi("/api/projects", { user });
    expect(res.status).toBe(200);
    expect(JSON.stringify(await res.json())).toContain("テスト案件");
  });

  it("AC-platform-02: ローカルの Supabase で本物のログイン（ES256）をしたトークンで API が通る", async () => {
    const user = await createTestUser();
    const header = JSON.parse(
      Buffer.from(user.accessToken.split(".")[0], "base64url").toString(),
    ) as { alg: string };
    expect(header.alg).not.toBe("HS256");
    const res = await callApi("/api/projects", { user });
    expect(res.status, await res.clone().text()).toBe(200);
  });

  it("AC-platform-01: 共有シークレットで HS256 署名したトークン（今の本番と同じ方式）でも API が通る", async () => {
    const user = await createTestUser();
    const hs256 = await signHs256(
      { sub: user.id, email: user.email, role: "authenticated" },
      { secret: inject("supabase").jwtSecret },
    );
    const res = await callApi("/api/projects", {
      user: { ...user, accessToken: hs256 },
    });
    expect(res.status, await res.clone().text()).toBe(200);
  });

  it("AC-platform-05: 認証なしでは 401 になる", async () => {
    const res = await callApi("/api/projects");
    expect(res.status).toBe(401);
  });
});
