# Security

セキュリティパターンと原則。

## Philosophy

- 認証ファースト
- 最小権限の原則
- シークレットは環境変数で管理

## Authentication

- JWT 認証: Supabase JWT を `jose` で検証
- API Key 認証: 固定キーで外部システム認証
- CORS: 許可オリジンのみアクセス可能

## Secrets Management

環境変数で管理（`.dev.vars`、Cloudflare Secrets）：

| Variable                    | Purpose                   |
| --------------------------- | ------------------------- |
| `SUPABASE_URL`              | Supabase プロジェクト URL |
| `SUPABASE_SERVICE_ROLE_KEY` | DB 管理用キー             |
| `SUPABASE_JWT_SECRET`       | JWT 検証用                |
| `API_KEY`                   | 外部システム認証          |

**Never commit** `.dev.vars` to Git.

## Input Validation

Zod スキーマで全入力を検証：

```typescript
validator("json", EffortDraftSchema)
```

## Authorization

- Service Role Key でバックエンドから DB 操作
- ユーザー ID はコンテキストから取得（改ざん不可）

---
_Focus on patterns and decisions._
