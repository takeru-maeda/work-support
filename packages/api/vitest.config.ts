import { defineConfig } from "vitest/config";

// .dev.vars（本番の接続情報）は読み込まない。DB につながるテストの環境変数は、
// テスト用 DB を用意するとき（ハーネス移行計画の P3 / P4）に、テスト専用のファイルから渡す
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
  },
});
