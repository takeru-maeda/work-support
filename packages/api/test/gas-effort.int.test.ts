import { describe, expect, it } from "vitest";

import { callApi, createTestUser, testEnv } from "./helpers";

// GAS / Google Form からの取り込み（POST /api/effort）は API キーで認証し、JWT は求めない。
// 同じパスの下に JWT のルート（/api/effort/*）があるので、認証の取り違えが起きていないことを確かめる
// （docs/reference/api.md の「認証」の列もこれを前提にしている）
const EFFORT_TEXT = "■GAS の案件\n・設計：[2]<1.5>";

describe("POST /api/effort（GAS からの取り込み）", () => {
  it("正しい API キーとユーザーのメールアドレスなら、JWT なしで登録でき、そのユーザーの案件になる", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/effort", {
      method: "POST",
      bearer: testEnv().API_KEY,
      body: { date: "2026-10-13", email: user.email, effort: EFFORT_TEXT },
    });
    expect(res.status, await res.clone().text()).toBe(201);

    const projects = await callApi("/api/projects", { user });
    expect(JSON.stringify(await projects.json())).toContain("GAS の案件");
  });

  it("API キーが違えば 401", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/effort", {
      method: "POST",
      bearer: "wrong-api-key",
      body: { date: "2026-10-13", email: user.email, effort: EFFORT_TEXT },
    });
    expect(res.status).toBe(401);
  });

  it("ユーザーのアクセストークン（JWT）では登録できない", async () => {
    const user = await createTestUser();
    const res = await callApi("/api/effort", {
      method: "POST",
      user,
      body: { date: "2026-10-13", email: user.email, effort: EFFORT_TEXT },
    });
    expect(res.status).toBe(401);
  });
});
