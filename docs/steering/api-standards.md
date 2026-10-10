# API の規約

## 方針

- リソース単位で予測しやすいパスにする
- 入出力の契約は `packages/shared/src/schemas` の Zod スキーマで明示する
- 認証を業務ロジックより先に済ませる

## パス

```
/api/{resource}[/{id}][/{sub-resource}]
```

例: `GET /api/effort/draft`、`POST /api/effort/entries`、`GET /api/goals/current`、`POST /api/logs/error`

ルートの登録は `packages/api/src/index.ts` の `app.route("/api/<resource>", <feature>)` に集める。

**HTTP メソッド**: GET は読み取り（安全・冪等）、POST は作成、PUT は更新、DELETE は削除（冪等）。

## リクエストとレスポンス

- **入力**: `hono-openapi` の `validator("json" | "query", Schema)` で検証し、`c.req.valid(...)` で受け取る。スキーマは shared に置く。
- **成功時**: 形はエンドポイントごとに shared の `*ResponseSchema` で定義する（全体で共通の包み方はない）。新しく作るときは、同じ機能の既存エンドポイントに合わせる。
- **エラー時**: `globalErrorHandler` が次の形で返す。

```json
{ "error": "エラーメッセージ", "accessLogId": "uuid" }
```

`accessLogId` で `access_logs` / `error_logs` をたどれる。

## ステータスコード

| コード | 使う場面 |
| --- | --- |
| 200 | 成功（読み取り・更新） |
| 201 | 作成の成功 |
| 204 | 成功（本文なし） |
| 400 | 入力の検証エラー |
| 401 | 認証エラー |
| 404 | 対象が見つからない |
| 500 | サーバーエラー |

想定どおりの「適用しなかった」結果はエラーにしない。例: 下書きの保存で `clientUpdatedAt` が古いときは、200 で `{ applied: false, reason }` を返す。

## 認証

- **JWT**（`jwtAuthMiddleware`）: Web からのリクエスト。`Authorization: Bearer <Supabase JWT>`
- **API キー**（`apiKeyAuthMiddleware`）: 外部システム（GAS）からのリクエスト。`Authorization: Bearer <API_KEY>`

詳しくは `authentication.md`。

## OpenAPI

- 各ルートに `describeRoute` でレスポンスのスキーマを書く（`resolver(Schema)`）
- Swagger UI: `/ui`、OpenAPI JSON: `/openapi`

---
_エンドポイントの一覧ではなく、パターンと判断を書く。一覧は各機能の仕様書にある_
