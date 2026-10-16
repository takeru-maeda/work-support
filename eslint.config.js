// ESLint の設定（モノレポ全体でこの 1 ファイルだけ）。整形は Prettier が担い、ここでは扱わない
import fs from "node:fs";
import path from "node:path";

import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const featuresOf = (dir) =>
  fs
    .readdirSync(path.join(import.meta.dirname, dir), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

/**
 * 層のルール（docs/steering/structure.md）を import/no-restricted-paths の zone にします。
 * 機能の一覧はフォルダから作るので、機能を足しても設定は変えなくてよい。
 */
function layerZones() {
  const web = "packages/web/src";
  const api = "packages/api/src";
  const webFeatures = featuresOf(`${web}/features`);
  const apiFeatures = featuresOf(`${api}/features`);
  return [
    // web: 依存は app → pages → features → 共通（api, components, hooks, lib, store, config, types）の一方向
    ...webFeatures.map((feature) => ({
      target: `${web}/features/${feature}`,
      from: `${web}/features`,
      except: [`./${feature}`],
      message:
        "機能どうしは import しない。2 つ以上の機能で使うものは共通の場所（API は src/api/、部品は components/、関数は lib/、型は @shared）へ移す",
    })),
    {
      target: [
        "api",
        "components",
        "config",
        "hooks",
        "lib",
        "store",
        "types",
      ].map((dir) => `${web}/${dir}`),
      from: [`${web}/features`, `${web}/pages`, `${web}/app`],
      message:
        "共通の層から features / pages / app は import しない。機能を組み合わせるものは app/ か pages/ に置く",
    },
    {
      target: `${web}/features`,
      from: [`${web}/pages`, `${web}/app`],
      message:
        "features から pages / app は import しない。ページが機能を組み立てる向きにする",
    },
    {
      target: `${web}/pages`,
      from: `${web}/app`,
      message: "pages から app は import しない",
    },
    // api: index.ts → service.ts → repository.ts の一方向。ほかの機能は service を通す
    ...apiFeatures.map((feature) => ({
      target: `${api}/features/${feature}`,
      from: `${api}/features`,
      except: [
        `./${feature}`,
        ...apiFeatures
          .filter((other) => other !== feature)
          .map((other) => `./${other}/service.ts`),
      ],
      message:
        "ほかの機能の repository / index / types は直接 import しない。その機能の service を通す",
    })),
    {
      target: `${api}/features/*/repository.ts`,
      from: [`${api}/features/*/service.ts`, `${api}/features/*/index.ts`],
      message:
        "repository から service / index は import しない（index → service → repository の一方向）",
    },
    {
      target: `${api}/features/*/service.ts`,
      from: [`${api}/features/*/index.ts`],
      message:
        "service から index（ルート）は import しない（index → service → repository の一方向）",
    },
    {
      // エラーの記録は横断の仕組みなので、errorHandler から logs の service だけは使ってよい
      target: `${api}/lib`,
      from: `${api}/features`,
      except: ["./logs/service.ts"],
      message:
        "lib から features は import しない。機能に依存する処理は features に置く",
    },
    {
      // GAS の API キーの認証は、本文のメールアドレスを effort の入力の型で読む
      target: `${api}/middleware`,
      from: `${api}/features`,
      except: ["./effort/types.ts"],
      message: "middleware から features は import しない",
    },
  ];
}

export default defineConfig([
  globalIgnores([
    "**/dist",
    "**/node_modules",
    "**/.wrangler",
    "dev/",
    // 外部スキルの同梱ファイルは対象外。自前の hook だけを見る
    ".claude/*",
    "!.claude/hooks",
    // Supabase CLI の生成物（手で編集しない）
    "packages/shared/src/types/db.ts",
    // Playwright の実行結果（HTML のレポートは JS を含む）
    "packages/e2e/test-results",
    "packages/e2e/playwright-report",
  ]),

  // Node で動くスクリプトと設定ファイル
  {
    files: ["**/*.{js,mjs}"],
    extends: [js.configs.recommended, prettierConfig],
    languageOptions: { globals: globals.node },
  },

  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      prettierConfig,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { import: eslintPluginImport },
    settings: {
      // パスエイリアスとワークスペースのパッケージは、外部の依存として扱わない
      "import/internal-regex": "^(@/|@shared/|shared$|shared/)",
      // @/ などのエイリアスを実際のファイルに解決する（層のルールの判定に要る）
      "import/resolver": {
        typescript: {
          project: [
            "packages/web/tsconfig.app.json",
            "packages/web/tsconfig.node.json",
            "packages/api/tsconfig.json",
            "packages/shared/tsconfig.json",
            "packages/e2e/tsconfig.json",
          ],
          // パッケージごとに tsconfig が分かれているのは意図どおり
          noWarnOnMultipleProjects: true,
        },
        node: true,
      },
    },
    rules: {
      // 各パッケージは、自分の package.json に書いた依存だけを import する
      // （ルートに入っている依存を宣言なしで使うと、ルートの整理で壊れる）
      "import/no-extraneous-dependencies": "error",
      // 型だけの import は import type にする（verbatimModuleSyntax と合わせる）
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "separate-type-imports" },
      ],
      // 先頭が _ の変数と引数は「使わないことを明示したもの」として許す
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // 順序は docs/steering/structure.md の「import の順序」: 外部 → パスエイリアス → 相対
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          pathGroups: [
            { pattern: "@/**", group: "internal" },
            { pattern: "@shared/**", group: "internal" },
            { pattern: "shared", group: "internal" },
            { pattern: "shared/**", group: "internal" },
          ],
          pathGroupsExcludedImportTypes: ["builtin", "external"],
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],
    },
  },

  // 層のルール（docs/steering/structure.md）。テストは画面を組み立てて確かめるので対象外
  {
    files: ["packages/{web,api}/src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "packages/web/src/test/**"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        { basePath: import.meta.dirname, zones: layerZones() },
      ],
    },
  },

  // React（web のみ）
  {
    files: ["packages/web/**/*.{ts,tsx}"],
    extends: [
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    rules: {
      // 推奨設定では warn。依存の漏れは古い値を使う不具合になるので、止める
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    // shadcn/ui の部品は variants などの定数も一緒に export する作り
    files: ["packages/web/src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // テストのコードは開発サーバーの Fast Refresh で読み込まれない
    files: ["packages/web/src/test/**", "packages/web/**/*.test.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
