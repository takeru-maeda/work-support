import { defineConfig, mergeConfig } from "vitest/config";

import viteConfig from "./vite.config";

/** テストの画面のオリジン。API も同じオリジンに置き、jsdom の CORS の判定を受けないようにする */
const TEST_ORIGIN = "http://app.test";

export default mergeConfig(
  viteConfig,
  defineConfig({
    // .env（開発用の Supabase と API の接続先）を読ませない。接続先は下の test.env に固定し、
    // 通信はすべて MSW で受ける
    envDir: false,
    test: {
      environment: "./src/test/environment.ts",
      environmentOptions: { jsdom: { url: `${TEST_ORIGIN}/` } },
      setupFiles: ["./src/test/setup.ts"],
      env: {
        // 利用者は日本時間で使う。日付の計算（端末の今日、期間の比較）を、手元のタイムゾーンに左右されずに確かめる
        TZ: "Asia/Tokyo",
        VITE_SUPABASE_URL: "http://supabase.test",
        VITE_SUPABASE_ANON_KEY: "test-anon-key",
        VITE_API_BASE_URL: TEST_ORIGIN,
      },
    },
  }),
);
