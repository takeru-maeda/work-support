import { builtinEnvironments } from "vitest/environments";

import type { Environment } from "vitest/environments";

// jsdom の環境に入る前に、Node の AbortController / AbortSignal を控えておく
const { AbortController, AbortSignal } = globalThis;

/**
 * jsdom の環境で、AbortController / AbortSignal だけは Node のものを使う Vitest の環境です。
 *
 * Node 24 の fetch（undici 7）は、jsdom の AbortSignal を受け付けない。MSW を通した通信（axios の XHR も
 * 内部で Request を作る）が「Expected signal to be an instance of AbortSignal」で失敗するのを防ぐ
 * （vitest-dev/vitest#8374）。
 */
const jsdomWithNodeAbort: Environment = {
  name: "jsdom-node-abort",
  transformMode: "web",
  async setup(global, options) {
    const env = await builtinEnvironments.jsdom.setup(global, options);
    global.AbortController = AbortController;
    global.AbortSignal = AbortSignal;
    return env;
  },
};

export default jsdomWithNodeAbort;
