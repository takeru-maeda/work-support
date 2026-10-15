import { describe, expect, it } from "vitest";

import { parseAuthorizationDetails } from "./oauthConsent";

describe("parseAuthorizationDetails（ローカルの Supabase で確かめた実際の形）", () => {
  it("初めての連携なら、アプリの名前と戻り先", () => {
    expect(
      parseAuthorizationDetails({
        authorization_id: "a1",
        redirect_uri: "http://127.0.0.1:33418/callback",
        client: { id: "c1", name: "Claude" },
        scope: "email",
      }),
    ).toEqual({
      kind: "pending",
      clientName: "Claude",
      redirectUri: "http://127.0.0.1:33418/callback",
    });
  });

  it("同意済みなら、認可コード付きの戻り先", () => {
    expect(
      parseAuthorizationDetails({
        redirect_url: "http://127.0.0.1:33418/callback?code=x&state=s",
      }),
    ).toEqual({
      kind: "consented",
      redirectUrl: "http://127.0.0.1:33418/callback?code=x&state=s",
    });
  });

  it("supabase-js の型の形（client_name）も読む", () => {
    expect(
      parseAuthorizationDetails({
        authorization_id: "a1",
        client: { client_id: "c1", client_name: "Cursor" },
      }),
    ).toMatchObject({ kind: "pending", clientName: "Cursor", redirectUri: "" });
  });

  it.each([[{ client: { id: "c1", name: null } }], [{ client: { id: "c1" } }]])(
    "名前の無いアプリ %j も同意できる（自動登録では名前は任意）",
    (data) => {
      expect(parseAuthorizationDetails(data)).toMatchObject({
        kind: "pending",
        clientName: "名前の無いアプリ",
      });
    },
  );

  it.each([null, "x", {}])("読めない形 %j は null", (data) => {
    expect(parseAuthorizationDetails(data)).toBeNull();
  });
});
