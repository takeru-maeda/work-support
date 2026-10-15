import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// 単体テスト（vitest.config.ts）と結合テスト（vitest.int.config.ts）で共通の設定。
// 本番や開発用の接続情報（.dev.vars）は、どちらのテストにも読み込ませない
export default defineConfig({
  resolve: {
    alias: {
      // 本番の Workers（workerd）と同じ、fetch と Web Crypto を使う版の jose を読み込む
      // （Node 向けの版は JWKS の取得に http を使い、本番と挙動がずれる）
      jose: fileURLToPath(
        new URL("./node_modules/jose/dist/browser/index.js", import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // 本番の Workers は UTC で動く。日付と時刻の計算（週の境目など）を、手元のタイムゾーンに左右されずに
    // 本番と同じ条件で確かめる
    env: { TZ: "UTC" },
  },
});
