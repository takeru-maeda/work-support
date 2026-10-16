---
paths:
  - "packages/**/*.test.{ts,tsx}"
  - "packages/**/*.spec.ts"
  - "packages/**/vitest*.ts"
  - "packages/*/test/**"
  - "packages/e2e/**"
---

# テストのチェックリスト

正典は `docs/steering/testing.md`。

- 受け入れ基準に対応するテストは、名前に `AC-<feature>-NN` を入れる
- 実装ではなく振る舞いを確かめる。実際の時刻に依存させない（時刻は固定する）
- バグ修正は、先に落ちるテストを書いてから直す
- テストに `.dev.vars` や `.env`（本番・開発用の接続情報）を読み込ませない。api の DB を使うテストは `*.int.test.ts` にし、ローカルの Supabase（`pnpm db:start`）にだけつなぐ（`pnpm test:int`）。テストごとに `createTestUser` で一意なユーザーを作り、共有のデータに頼らない
- テストの実行は、成功は静かに、失敗だけが見えるようにする（`--reporter=dot`）
- web の部品テストは MSW で通信を受ける（ハンドラーの無い通信は失敗になる）。E2E は `packages/e2e` で、テストごとに一意なユーザーを作る
- 使う外部スキル: Vitest の書き方は `vitest`（v5 向けなので 3.2 の API で確かめる）、E2E は `playwright-best-practices`
