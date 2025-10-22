import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier'; // Prettier連携用
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintPluginImport from 'eslint-plugin-import';

export default defineConfig([
  // モノレポ全体の無視設定
  globalIgnores(['**/dist', '**/node_modules', '**/.wrangler']),

  // すべての .ts, .tsx ファイルに適用
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      prettierConfig, // Prettierとの競合ルールを無効化
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser, // webパッケージ用
        ...globals.node,   // apiパッケージ用
      },
      parser: tseslint.parser,
      parserOptions: {
        project: [
          './tsconfig.base.json',
          './packages/api/tsconfig.json',
          './packages/web/tsconfig.json',
        ],
      },
    },
    rules: {
      'prettier/prettier': 'error', // PrettierのルールをESLintエラーとして報告
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin', 'external'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],
    },
    plugins: {
      prettier: (await import('eslint-plugin-prettier')).default,
      import: eslintPluginImport,
    },
  },

  // React関連のルール (webパッケージのみ)
  {
    files: ['packages/web/**/*.{ts,tsx}'],
    extends: [
      (await import('eslint-plugin-react-hooks')).configs['recommended-latest'],
      (await import('eslint-plugin-react-refresh')).configs.vite,
    ],
  },
]);
