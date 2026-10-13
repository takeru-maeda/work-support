import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./server";

// ハンドラーの無い通信はテストの失敗にする（本物の API や Supabase に出ていかないように）
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  server.resetHandlers();
  // globals を使わないので、Testing Library の自動の後片付けが効かない
  cleanup();
});
afterAll(() => server.close());
