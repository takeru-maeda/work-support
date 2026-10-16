import { describe, expect, it } from "vitest";

import { collectEndpoints } from "../scripts/apiReference";

import { callApi, createTestUser } from "./helpers";
import { getOAuthAccessToken } from "./oauthHelpers";

// MCP のクライアントに出した OAuth のトークン（client_id の claim を持つ）は、この API では /mcp だけで受け付ける
// （docs/specs/platform/spec.md の AC-platform-20、docs/specs/mcp/spec.md の INV-mcp-2）。
// ルートの一覧はアプリから作るので、JWT のルートを足しても、ここで漏れなく確かめられる
const jwtRoutes = (await collectEndpoints()).filter((e) => e.auth === "JWT");

describe("OAuth のクライアントのトークンの範囲", () => {
  it("JWT のルートが 1 つ以上ある（一覧の作り方が壊れていない）", () => {
    expect(jwtRoutes.length).toBeGreaterThan(10);
  });

  it("AC-platform-20: JWT のどのルートも、OAuth のクライアントのトークンでは 401", async () => {
    const user = await createTestUser();
    const { accessToken } = await getOAuthAccessToken(user);

    const accepted: string[] = [];
    for (const route of jwtRoutes) {
      const method = route.method as "GET" | "POST" | "PUT" | "DELETE";
      const res = await callApi(route.path.replace(/:\w+/g, "1"), {
        method,
        bearer: accessToken,
        body: method === "GET" || method === "DELETE" ? undefined : {},
      });
      if (res.status !== 401)
        accepted.push(`${route.method} ${route.path} → ${res.status}`);
    }

    expect(accepted).toEqual([]);
  });

  it("AC-platform-20: web のトークン（client_id が無い）は今までどおり通る", async () => {
    const user = await createTestUser();

    const res = await callApi("/api/missions", { user });

    expect(res.status).toBe(200);
  });
});
