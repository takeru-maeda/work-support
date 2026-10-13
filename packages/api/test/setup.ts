import { afterEach, vi } from "vitest";

import { TEST_GAS_ENDPOINT } from "./helpers";

/**
 * 結合テストでは、メール送信（GAS への fetch）だけを横取りし、本物のメールを送らない。
 * それ以外の fetch（ローカルの Supabase への通信）はそのまま通す。
 */
export const sentMails: unknown[] = [];

const realFetch = globalThis.fetch;
vi.stubGlobal(
  "fetch",
  async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    if (url.startsWith(TEST_GAS_ENDPOINT)) {
      sentMails.push(init?.body ? JSON.parse(String(init.body)) : null);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return realFetch(input, init);
  },
);

afterEach(() => {
  sentMails.length = 0;
});
