# Database

データベース設計とアクセスパターン。

## Philosophy

- Supabase (PostgreSQL) を使用
- 型安全なクライアント
- Repository パターンでデータアクセスを分離

## Stack

- **Supabase**: PostgreSQL + 認証 + リアルタイム
- **型生成**: `supabase gen types` → `shared/src/types/db.ts`

## Client Pattern

シングルトンクライアント：

```typescript
let client: SupabaseClient<Database> | null = null;

export const createSupabaseClient = (
  env: HonoEnv["Bindings"],
): SupabaseClient<Database> => {
  if (client) return client;
  client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  return client;
};
```

## Repository Pattern

`features/**/repository.ts` でデータアクセスを実装：

```typescript
// features/effort/repository.ts
export const getEffortDraft = async (
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<EffortDraftRecord | null> => {
  const { data, error } = await supabase
    .from("effort_drafts")
    .select("*")
    .eq("user_id", userId)
    .single();
  // ...
};
```

## Key Tables

- `effort_entries`: 工数エントリ
- `effort_drafts`: 工数ドラフト
- `goals`: 目標
- `missions`: ミッション
- `access_logs`, `error_logs`, `info_logs`: ログ

## Type Safety

`shared/src/types/db.ts` から型をインポート：

```typescript
import { Database, Tables } from "shared/types/db";
```

---
_Focus on patterns and decisions._
