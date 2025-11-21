# Work Support API

仕事サポートアプリのバックエンドは Cloudflare Workers 上で動作する Hono.js アプリケーションです。工数登録・目標管理・週報出力などフロントエンドが利用する API を提供し、仕様は `@docs/specs` に定義された設計を唯一の参照源とします。モノレポ全体の概要は `AI_AGENT_GUIDE.md` とルート `README.md` を参照してください。

## 技術スタック
- Hono.js (Cloudflare Workers)
- Supabase (PostgreSQL + 認証)
- hono-openapi / Zod（リクエスト検証と OpenAPI 自動生成）
- Google Apps Script 連携（メール送信ユーティリティ）
- Vitest（テスト）

## アーキテクチャ
フィーチャーベース（Vertical Slice）でモジュール化しています。`packages/api/src` の主な構成は以下の通りです。

```
packages/api/src/
├── index.ts           // Hono アプリのエントリポイント
├── custom-types.ts    // Hono の型拡張
├── lib/               // Supabase クライアント、メール送信などのユーティリティ
├── middleware/        // jwtAuthMiddleware, apiKeyAuthMiddleware, accessLogMiddleware 等
└── features/
    ├── effort/        // 工数登録・ドラフト API
    ├── goals/         // 目標管理 API
    ├── missions/      // ミッション管理 API
    ├── reports/       // 週報生成 API
    └── logs/          // UI 由来エラーログ API
```

- `index.ts`: ルーティングのエントリーポイント。CORS、認証、エラーハンドラを組み合わせて各フィーチャーのルーターをマウントします。
- `features/**/index.ts`: HTTP ルート定義・Zod バリデーションを担当。
- `features/**/service.ts`: ビジネスロジック（ユースケース）を実装。
- `features/**/repository.ts`: Supabase への永続化ロジックを提供。
- `middleware/logger.ts`: アクセスログ／エラーログを `access_logs`・`info_logs`・`error_logs` へ記録。

詳細は `@docs/specs/design/02-backend.md` と `@docs/specs/design/08-logic.md` を参照してください。

## 認証とセキュリティ
- フロントエンドからのリクエストは `jwtAuthMiddleware` を通じ、Supabase の JWT を検証してユーザーを特定します。
- Google Apps Script など外部システムからの工数登録は固定 API キー (`Authorization: Bearer <API_KEY>`) による `apiKeyAuthMiddleware` で保護します。
- すべてのルートで CORS 設定を適切に行い、許可されたオリジンのみアクセスできるようにします。

## エンドポイント
API 一覧とスキーマ詳細は `@docs/specs/design/05-api.md` および `packages/shared` の Zod 定義を参照してください。

## 環境変数
`packages/api/.dev.vars`（ローカル開発）や Cloudflare Workers の Secrets に次の変数を設定してください。

| 変数名 | 必須 | 説明 | 例 |
| --- | --- | --- | --- |
| `SUPABASE_URL` | 必須 | Supabase プロジェクトの URL。 | `https://xyzcompany.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | 必須 | Supabase Service Role キー（DB への管理操作用）。 | `eyJhbGciOi...` |
| `SUPABASE_JWT_SECRET` | 必須 | Supabase が発行する JWT を検証するための秘密鍵。 | `super-secret-jwt-key` |
| `API_KEY` | 必須 | Google Apps Script など外部サービスからの API 認証に利用する固定キー。 | `my-secure-api-key` |
| `GAS_EMAIL_ENDPOINT` | 必須 | 工数登録完了メールを送信する Google Apps Script のエンドポイント。 | `https://script.google.com/macros/s/.../exec` |
| `PROD_FRONTEND_URL` | 必須 | 本番フロントエンドのオリジン（CORS 許可対象）。 | `https://work-support-web.vercel.app` |
| `DEV_FRONTEND_URL` | 任意 | 開発時に許可するフロントエンドのオリジン。未設定時は `http://localhost:5173` を使用。 | `http://localhost:5173` |

> `.dev.vars` は Git 管理下に置かないでください。Cloudflare では `wrangler secret put` を利用して本番値を登録します。

## 環境構築
1. ルートで依存関係をインストールします。
   ```bash
   pnpm install
   ```
2. 上記の環境変数を `packages/api/.dev.vars` に設定します（詳細は `@docs/specs/design/07-operations.md` を参照）。
3. 開発サーバーを起動します。
   ```bash
   pnpm run dev:api
   ```
   `wrangler dev` により `http://localhost:8787` で Workers をエミュレートできます。

## OpenAPI / ドキュメント
- ローカル（`wrangler dev`）:
  - Swagger UI: `http://localhost:8787/ui`
  - OpenAPI JSON: `http://localhost:8787/openapi`
- 本番（Cloudflare Workers）:
  - Swagger UI: `https://work-support.noreply-work-s-dev.workers.dev/ui`
  - OpenAPI JSON: `https://work-support.noreply-work-s-dev.workers.dev/openapi`

`hono-openapi` がルート定義の Zod スキーマから仕様を生成します。ドキュメントの更新が必要な場合は、ルートの `docsRoute` 設定を調整してください。

## ログとオペレーション
- リクエストごとに `accessLogMiddleware` が `access_logs` に記録し、コンテキストに `access_log_id` を渡します。
- アプリ内で `AppError` などのカスタムエラーを投げると、グローバルエラーハンドラが `error_logs` に記録し、UI から送信されたログは `source = 'UI'` として保存されます。
- クリティカルなエラー時はメール通知を行う設計です。詳細は `@docs/specs/design/07-operations.md` を参照してください。

## テスト
- Vitest を使用します。テストファイルは `*.test.ts` に統一し、Hono のテストクライアント (`app.request`) を用いてルートごとの振る舞いを検証します。
  ```bash
  pnpm --filter api test
  ```
- 継続的な実装では仕様の主要フロー（工数ドラフトの同時実行制御、目標進捗計算など）をユニットテストでカバーしてください。

## デプロイ
- Cloudflare Workers へは `pnpm -F api run deploy` でデプロイできます（`wrangler` が Cloudflare アカウントに認証されている必要があります）。
- GitHub Actions などの CI を利用する場合も、同等のコマンドでデプロイします。

## 参考ドキュメント
- プロジェクト概要: `AI_AGENT_GUIDE.md`
- 要件定義: `@docs/specs/requirements/index.md`
- バックエンド設計: `@docs/specs/design/02-backend.md`
- API 詳細: `@docs/specs/design/05-api.md`
- データベース設計: `@docs/specs/design/09-database.md`
- ロジック詳細: `@docs/specs/design/08-logic.md`

仕様やデータモデルに変更を加える際は、該当ドキュメントとこの README を同時に更新して整合性を保ってください。
