# Authentication

認証パターンとフロー。

## Philosophy

- Supabase 認証基盤を活用
- 2種類の認証方式（JWT / API Key）
- ビジネスロジック前に認証検証

## Auth Methods

### 1. JWT Authentication

フロントエンドからのリクエスト用。

```typescript
export const jwtAuthMiddleware = createMiddleware(async (c, next) => {
  const token = extractBearerToken(c);
  const payload = await jwtVerify(token, secretKey);
  c.set("user", buildAuthenticatedUser(payload));
  await next();
});
```

**Flow**:
1. `Authorization: Bearer <jwt>` ヘッダー取得
2. `jose` で JWT 検証
3. `c.set("user", ...)` でコンテキストに保存

### 2. API Key Authentication

外部システム（GAS）からのリクエスト用。

```typescript
export const apiKeyAuthMiddleware = createMiddleware(async (c, next) => {
  const apiKey = extractBearerToken(c);
  if (apiKey !== c.env.API_KEY) throw new AppError(401, "Unauthorized");
  
  const user = await findUserByEmail(body.email);
  c.set("user", user);
  await next();
});
```

## AuthenticatedUser

```typescript
interface AuthenticatedUser {
  id: string;      // Supabase user ID
  email: string | null;
}
```

## Route Protection

```typescript
// JWT 認証が必要なルート
appEffort.use("*", jwtAuthMiddleware);

// API Key 認証が必要なルート
gasEffort.post("/", apiKeyAuthMiddleware, ...);
```

## CORS

許可オリジンのみアクセス可能：

- `PROD_FRONTEND_URL`
- `DEV_FRONTEND_URL` (localhost)

---
_Focus on patterns and decisions._
