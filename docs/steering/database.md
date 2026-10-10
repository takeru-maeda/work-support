# データベース

## 方針

- Supabase（PostgreSQL）を使う
- バックエンドから **service role キー** で接続する。行単位の権限（RLS）には頼らず、**API 側で必ず `user_id` を条件に入れる**
- データアクセスは各機能の `repository.ts` に閉じ込める

## クライアント

`packages/api/src/lib/supabase.ts` の `createSupabaseClient(c.env)` を使う（Worker の中で使い回すシングルトン）。ルートで生成し、service と repository に引数で渡す。

## repository の書き方

```typescript
// features/effort/repository.ts :: getWorkEntryDraftByUser
export const getWorkEntryDraftByUser = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<EffortDraftRecord | null> => {
  const { data, error } = await supabase
    .from("work_entry_drafts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    const message = `Failed to fetch work entry draft: ${error.message}`;
    throw new AppError(500, message, error);
  }
  return data;
};
```

- 引数で `supabase` と `userId` を受け取り、ユーザーのデータだけを読む・書く
- Supabase のエラーは `AppError` に包んで投げる（`error-handling.md`）

## 主なテーブル

| テーブル | 内容 |
| --- | --- |
| `work_records` | 工数の実績 |
| `work_entry_drafts` | 工数登録の下書き（端末間の同期と競合の検知に使う） |
| `projects` / `tasks` | 案件とタスクのマスタ |
| `goals` / `goal_progress_histories` | 目標と週ごとの進捗 |
| `missions` | ミッション |
| `user_settings` | ユーザー設定 |
| `access_logs` / `error_logs` / `info_logs` | ログ |

ビュー: `projects_with_tasks_mv`（案件とタスクの一覧）、`work_record_diffs`。

正確な定義は `packages/shared/src/types/db.ts`（生成型）とマイグレーション（`packages/api/supabase/migrations/`）を正とする。

## 型

- 行の型は生成型から取る: `Tables<"goals">` など
- 生成型 `db.ts` は手で編集しない。スキーマを変えたら生成し直す

## スキーマの変更

- 変更は必ず `packages/api/supabase/migrations/` に SQL ファイルとして追加する
- **DB へ適用する操作（テスト用 DB を含む）は、実行前に必ずユーザーへ確認する**。エージェントが直接 DDL / DML を流すことはしない
- マイグレーションの管理は移行中（ハーネス移行計画の P3 で、本番のスキーマを取り込んで基準にする）

---
_テーブルの一覧ではなく、アクセスのパターンと判断を書く_
