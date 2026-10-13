// ESLint の設定（モノレポ全体でこの 1 ファイルだけ）。整形は Prettier が担い、ここでは扱わない
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import eslintPluginImport from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

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

  // React（web のみ）
  {
    files: ["packages/web/**/*.{ts,tsx}"],
    extends: [
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
  },
  {
    // shadcn/ui の部品は variants などの定数も一緒に export する作り
    files: ["packages/web/src/components/ui/**/*.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
