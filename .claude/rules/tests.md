---
paths:
  - "packages/**/*.test.{ts,tsx}"
  - "packages/**/vitest.config.ts"
  - "e2e/**"
---

# テストのチェックリスト

正典は `docs/steering/testing.md`。

- 受け入れ基準に対応するテストは、名前に `AC-<feature>-NN` を入れる
- 実装ではなく振る舞いを確かめる。実際の時刻に依存させない（時刻は固定する）
- バグ修正は、先に落ちるテストを書いてから直す
- `packages/api/vitest.config.ts` に `.dev.vars`（本番の接続情報）を読み込ませない。DB につながるテストは、テスト用 DB の仕組み（移行計画の P3 / P4）ができるまで書かない
- テストの実行は、成功は静かに、失敗だけが見えるようにする（`--reporter=dot`）
- 使う外部スキル: Vitest の書き方は `vitest`（v5 向けなので 3.2 の API で確かめる）、E2E は `playwright-best-practices`
