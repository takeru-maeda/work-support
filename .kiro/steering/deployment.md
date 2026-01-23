# Deployment

デプロイ戦略と環境構成。

## Philosophy

- シンプルなデプロイフロー
- 環境分離（dev/prod）
- 自動デプロイ優先

## Environments

| Environment | Backend                         | Frontend                |
| ----------- | ------------------------------- | ----------------------- |
| Development | `wrangler dev` (localhost:8787) | `vite` (localhost:5173) |
| Production  | Cloudflare Workers              | Vercel                  |

## Backend Deployment

Cloudflare Workers:

```bash
pnpm -F api run deploy  # wrangler deploy --minify
```

**Secrets**:
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# ...
```

## Frontend Deployment

Vercel 自動デプロイ:
- `main` ブランチへのプッシュで自動デプロイ
- ビルド: `pnpm --filter web build`

## URLs

- Frontend: `https://work-support-app.com`
- Backend: `https://work-support-api.com`
- Swagger UI: `https://work-support-api.com/ui`

## Local Development

```bash
pnpm install
pnpm dev:api   # localhost:8787
pnpm dev:web   # localhost:5173
```

---
_Focus on patterns and decisions._
