# API Standards

Work Support API の設計規約とパターン。

## Philosophy

- リソース指向の予測可能な設計
- Zod スキーマによる契約の明示化
- 認証ファースト（ビジネスロジック前に検証）

## Endpoint Pattern

```
/api/{resource}[/{id}][/{sub-resource}]
```

**Examples**:
- `GET /api/effort/draft` - 工数ドラフト取得
- `PUT /api/effort/draft` - 工数ドラフト保存
- `POST /api/effort/entries` - 工数エントリ登録
- `GET /api/goals` - 目標一覧
- `POST /api/logs/error` - UI エラーログ送信

**HTTP Verbs**:
- GET: 読み取り（安全・冪等）
- POST: 作成
- PUT: 更新（全体置換）
- DELETE: 削除（冪等）

## Request/Response

### Success Response
```json
{ "data": { ... }, "message": "..." }
```

### Error Response
```json
{ "error": "Error message", "accessLogId": "uuid" }
```

`accessLogId` でログ追跡が可能。

## Status Codes

| Code | Usage                        |
| ---- | ---------------------------- |
| 200  | 成功（読み取り・更新）       |
| 201  | 作成成功                     |
| 204  | 成功（レスポンスボディなし） |
| 400  | バリデーションエラー         |
| 401  | 認証エラー                   |
| 500  | サーバーエラー               |

## Validation

hono-openapi + Zod で自動バリデーション：

```typescript
import { validator } from "hono-openapi";
import { EffortDraftSchema } from "./types";

app.put("/draft", validator("json", EffortDraftSchema), async (c) => {
  const payload = c.req.valid("json"); // 型安全
});
```

## Authentication

2種類の認証パターン：

1. **JWT 認証** (`jwtAuthMiddleware`)
   - フロントエンドからのリクエスト
   - `Authorization: Bearer <supabase_jwt>`

2. **API Key 認証** (`apiKeyAuthMiddleware`)
   - 外部システム（GAS）からのリクエスト
   - `Authorization: Bearer <api_key>`

## OpenAPI

- Swagger UI: `/ui`
- OpenAPI JSON: `/openapi`

Zod スキーマから自動生成。

---
_Focus on patterns and decisions, not endpoint catalogs._
