---
paths:
  - "packages/api/src/**/*.ts"
---

# API 実装のチェックリスト

`packages/api/src` を編集するときに読み込まれる要点。正典は `docs/steering/structure.md`、`api-standards.md`、`database.md`、`error-handling.md`、`security.md`、`authentication.md`（必要な節を読む）。

- **層を混ぜない**: `index.ts`（検証と認証だけ）→ `service.ts`（業務ロジック）→ `repository.ts`（`supabase.from()` はここだけ）
- **すべてのクエリに `user_id` の条件**を入れる。ユーザー ID は `c.get("user")` から取る（service role キーで接続しているため RLS に守られない）
- 入出力のスキーマは `packages/shared/src/schemas` に置き、`validator("json" | "query", Schema)` で検証する。api 側でスキーマを定義し直さない
- 各ルートに `describeRoute` でレスポンスのスキーマを書く
- エラーは `AppError(status, message, cause?)` で投げる。Supabase のエラーは包んで意味のあるメッセージにする
- 成功時のレスポンスの形は、同じ機能の既存エンドポイントに合わせる
- 型だけの import は `import type`
- 手本: 新しいエンドポイントは同じ機能の既存ルートを、新しい機能は `features/goals/` を手本にする
- 使う外部スキル: Hono の API に確信が持てないときは `hono`、Workers の作法は `workers-best-practices`、Supabase のクライアントの使い方は `supabase`（どれも `.claude/rules/third-party-skills.md` の上書きルールに従う）
