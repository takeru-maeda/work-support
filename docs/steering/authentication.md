# 認証

## 方針

- 認証基盤は Supabase Auth を使う
- 入口に応じて 2 種類の認証を使い分ける（JWT / API キー）
- 認証はミドルウェアで済ませ、ルートの処理では `c.get("user")` だけを使う

## 認証の種類（`packages/api/src/middleware/auth.ts`）

### 1. JWT（`jwtAuthMiddleware`）
Web からのリクエスト用。

1. `Authorization: Bearer <jwt>` を取り出す（ない・形式が違うときは 401）
2. `lib/jwt.ts` の `verifySupabaseAccessToken` で検証する（失敗は 401）。署名方式はトークンのヘッダーで決まり、HS256 は `SUPABASE_JWT_SECRET`、ES256 / RS256 は Supabase が公開する JWKS で確かめる。共有シークレットを公開鍵方式の検証に使わない（方式の取り違えでなりすましを許すため。詳しくは `docs/specs/platform/spec.md`）
3. `client_id` の claim があるトークン（MCP のアプリに出した OAuth のトークン）は 401（`isOAuthClientToken`）
4. `c.set("user", { id, email })` でコンテキストに入れる

OPTIONS（CORS のプリフライト）は認証をとばす。

### 2. API キー（`apiKeyAuthMiddleware`）
外部システム（GAS / Google Form）から工数を取り込む `POST /api/effort` 用。

1. `Authorization: Bearer <API_KEY>` を環境変数 `API_KEY` と照合する（違えば 401）
2. 本文を `EffortRequestSchema` で検証し、`email` から Supabase のユーザーを探す（見つからなければ 400）
3. 見つけたユーザーを `c.set("user", ...)` に入れる

### 3. MCP（`/mcp`、`features/mcp/auth.ts`）
MCP のアプリ用。SDK の `requireBearerAuth` に、`verifySupabaseAccessToken` を包んだ verifier を渡す（401 と `WWW-Authenticate` は SDK が作る）。OAuth のトークンも web のトークンも受け付ける。OAuth のトークンでできることは `/mcp` のツールに限る: `/api/*` は上の 3、ブラウザから直接触る Supabase（Storage）はポリシーで `client_id` のあるトークンを拒む。Supabase Auth は止められない（`docs/specs/mcp/spec.md`）

## AuthenticatedUser

```typescript
interface AuthenticatedUser {
  id: string;           // Supabase のユーザー ID
  email: string | null;
}
```

## ルートの守り方

```typescript
appEffort.use("*", jwtAuthMiddleware);             // 機能全体を JWT で守る
gasEffort.post("/", apiKeyAuthMiddleware, ...);   // 個別のルートを API キーで守る
```

ユーザー ID は必ず `c.get("user")` から取る。リクエストの本文やクエリの `userId` を信用しない。

## フロントエンド

- Supabase のクライアント（`packages/web/src/lib/supabase.ts`）でログイン・新規登録・パスワード再設定を行う
- API を呼ぶときは `lib/apiClient.ts` がアクセストークンを `Authorization` に付ける
- 未ログイン時のルーティングは `AuthGuard` が担う（詳しくは auth の仕様書）

## CORS

`packages/api/src/index.ts` で、許可したオリジンだけを通す: `PROD_FRONTEND_URL`、`DEV_FRONTEND_URL`（未設定なら `http://localhost:5173`）。

---
_パターンと判断を書く_
