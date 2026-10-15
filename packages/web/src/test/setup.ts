import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import type * as Auth from "@/lib/auth";

import { server } from "./server";

// findBy / waitFor の待ちの上限。既定の 1 秒では、下書きの保存（800 ミリ秒の待ち）や、ほかのファイルと並べて回したときの
// 遅れに足りない
configure({ asyncUtilTimeout: 3000 });

// API に付けるトークンは固定する。本物の supabase-js の getSession は排他のロックを取るので、描画が続くと
// 待たされ、前のテストの通信が次のテストのハンドラーに届くことがある（テストの中ではログインしていないので値は null）
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof Auth>()),
  getAccessToken: async () => null,
}));

// 候補の一覧（cmdk）や Radix の部品は、jsdom に無い ResizeObserver と scrollIntoView を使う
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView ??= () => {};

// ハンドラーの無い通信はテストの失敗にする（本物の API や Supabase に出ていかないように）
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  // globals を使わないので、Testing Library の自動の後片付けが効かない
  cleanup();
});
afterAll(() => server.close());
