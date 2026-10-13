import { configDefaults, defineConfig, mergeConfig } from "vitest/config";

import shared from "./vitest.shared";

// 単体テスト（DB を使わない）。DB を使う結合テスト（*.int.test.ts）は vitest.int.config.ts で回す
export default mergeConfig(
  shared,
  defineConfig({
    test: {
      testTimeout: 10000,
      exclude: [...configDefaults.exclude, "**/*.int.test.ts"],
    },
  }),
);
