import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./redirect";

describe("safeRedirectPath（AC-auth-13）", () => {
  it.each([
    [
      "/oauth/consent?authorization_id=abc",
      "/oauth/consent?authorization_id=abc",
    ],
    ["/goals", "/goals"],
  ])("このサイトの中のパス %s はそのまま", (value, expected) => {
    expect(safeRedirectPath(value)).toBe(expected);
  });

  it.each([
    ["無い", null],
    ["空", ""],
    ["ほかのサイトの URL", "https://evil.example/x"],
    ["// で始まる（ほかのサイト）", "//evil.example"],
    ["/\\ で始まる（ブラウザが // と読む）", "/\\evil.example"],
    ["/ で始まらない", "goals"],
    ["javascript:", "javascript:alert(1)"],
    // URL の解釈はタブと改行を取り除くので、`/\t/evil.example` は //evil.example（外のサイト）になる
    ["/ の次にタブ", "/\t/evil.example"],
    ["/ の次に改行", "/\n/evil.example"],
    ["/ の次に復帰", "/\r/evil.example"],
    ["\\ を挟む", "/\\/evil.example"],
    ["先頭に空白", " //evil.example"],
  ])("%s ならホーム", (_label, value) => {
    expect(safeRedirectPath(value)).toBe("/");
  });
});
