---
paths:
  - "packages/shared/src/**/*.ts"
---

# shared のチェックリスト

`packages/shared/src` は api と web の両方から使われる。ここを変えると両側に影響する。

- スキーマや型を変えたら、`rg '<名前>' packages/api/src packages/web/src` で両側の参照をすべて確かめ、両側の型チェックを回す
- `src/types/db.ts` は Supabase の生成型。手で編集しない（スキーマを変えたら生成し直す）
- 置くのは API 契約（Zod スキーマ）と、両側で使う純粋関数だけ。React や Hono に依存するコードを置かない
- 純粋関数（`utils/`）は単体テストを書く。実行: `pnpm --filter shared exec vitest run <path> --reporter=dot`
- 型チェック: `pnpm --filter shared exec tsc --noEmit -p tsconfig.json`（変えたら api と web の型チェックも回す）
