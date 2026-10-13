---
paths:
  - "packages/api/supabase/**"
  - "packages/shared/src/types/db.ts"
  - "packages/shared/supabase-gen-types.sh"
---

# DB スキーマのチェックリスト

正典は `docs/steering/database.md`。

- **スキーマの変更は、SQL ファイルを書く前にユーザーへ確認する。DB への適用（テスト用 DB を含む）は、エージェントは行わない**
- 変更は `packages/api/supabase/migrations/` に新しいファイル（`<YYYYMMDDHHMMSS>_<内容>.sql`）として追加する。既存のマイグレーションを書き換えない。出発点は本番から作った `20261013000000_baseline.sql`
- Supabase CLI はルートの devDependencies にある（`pnpm exec supabase ... --workdir packages/api`）。本番と開発用は別のアカウントにあるので、DB に触れるコマンドは `--db-url` で接続先を明示する（接続文字列はユーザーが扱う）
- `supabase-postgres-best-practices` スキルを読んでから SQL を書く（Supabase 固有の機能は `supabase` スキル）
- 全体像は `docs/reference/database.md`（ER 図、列、外部キーの削除時の動き）。SQL を書く前に読む
- スキーマを変えたら、`pnpm db:types` で生成型 `packages/shared/src/types/db.ts` と `docs/reference/database.md` を作り直す（開発用のアカウントでのログインが必要なので、ユーザーに依頼する）。テーブルを足したり役割が変わったりしたら、`database.md` の「テーブルの役割」を手で直す
- ビューやマテリアライズドビュー（`projects_with_tasks_mv` など）に依存するクエリへの影響を確かめる
