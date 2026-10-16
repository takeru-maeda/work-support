import { defineConfig, mergeConfig } from "vitest/config";

import shared from "./vitest.shared";

// 結合テスト（*.int.test.ts）。ローカルの Supabase（pnpm db:start）にだけ接続する。
// 接続情報は test/globalSetup.ts が `supabase status` から読む
export default mergeConfig(
  shared,
  defineConfig({
    test: {
      include: ["**/*.int.test.ts"],
      globalSetup: ["./test/globalSetup.ts"],
      setupFiles: ["./test/setup.ts"],
      testTimeout: 30000,
      // リクエストのたびのログ（Hono の logger）は、失敗したテストの分だけ出す（成功は静かに）
      silent: "passed-only",
      hookTimeout: 30000,
    },
  }),
);
