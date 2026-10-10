---
paths:
  - "packages/api/supabase/**"
  - "packages/shared/src/types/db.ts"
  - "packages/shared/supabase-gen-types.sh"
---

# DB スキーマのチェックリスト

正典は `docs/steering/database.md`。

- **スキーマの変更は、SQL ファイルを書く前にユーザーへ確認する。DB への適用（テスト用 DB を含む）は、エージェントは行わない**
- 変更は `packages/api/supabase/migrations/` に新しいファイルとして追加する。既存のマイグレーションを書き換えない
- `supabase-postgres-best-practices` スキルを読んでから SQL を書く（Supabase 固有の機能は `supabase` スキル）
- スキーマを変えたら、生成型 `packages/shared/src/types/db.ts` の更新が必要になる（生成はユーザーに依頼する）
- ビューやマテリアライズドビュー（`projects_with_tasks_mv` など）に依存するクエリへの影響を確かめる
