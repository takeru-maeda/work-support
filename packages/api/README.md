# Work Support API

このパッケージは、仕事サポートアプリのバックエンドAPIです。Cloudflare Workers上で動作するHono.jsアプリケーションとして構築されています。

## アーキテクチャ

`packages/api` は、機能ごとに責務を分割する **フィーチャーベース（Vertical Slice）アーキテクチャ** を採用しています。これにより、コードの凝集性を高め、拡張性とメンテナンス性を向上させています。

各フィーチャーは、主に以下のファイルで構成されています。

- **`index.ts` (ルーティング層):** HTTPリクエストの受付、リクエストの検証、認証ミドルウェアの適用を行います。
- **`service.ts` (ビジネスロジック層):** アプリケーション固有のユースケースやビジネスルールを実装します。
- **`repository.ts` (データアクセス層):** データベース (Supabase) との通信を抽象化します。

詳細はプロジェクトルートの`@docs/design.md`を参照してください。

## APIエンドポイント

提供している主要なエンドポイントは以下の通りです。

- `POST /api/effort`: 工数を登録します。
- `GET /api/missions`: ミッションを取得します。
- `PUT /api/missions`: ミッションを更新します。
- `GET /api/goals`: 最新の目標リストを取得します。
- `POST /api/goals`: 新しい目標を作成します。
- `PUT /api/goals/{id}`: 目標を更新します。
- `DELETE /api/goals/{id}`: 目標を削除します。
- `GET /api/reports/weekly`: 週報を生成します。

各エンドポイントの詳細なリクエスト/レスポンス仕様については、後述のOpenAPIドキュメントを参照してください。

## 開発

### 1. 環境変数の設定

開発を開始する前に、`packages/api`ディレクトリのルートに`.dev.vars`ファイルを作成し、必要な環境変数を設定してください。

```
SUPABASE_ID=<your-supabase-project-id>
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
API_KEY=<your-secret-api-key>
RESEND_API_KEY=<your-resend-api-key>
APP_EMAIL=<your-app-email>
PROD_FRONTEND_URL=<your-production-frontend-url>
DEV_FRONTEND_URL=<your-development-frontend-url>
```

### 2. 開発サーバーの起動

プロジェクトのルートディレクトリで以下のコマンドを実行すると、開発サーバーが起動します。

```bash
pnpm dev:api
```

これにより、`wrangler dev`が実行され、ローカルでAPIの動作確認ができます。

## APIドキュメント (OpenAPI)

このAPIは`hono-openapi`を利用して、OpenAPI仕様に基づいたドキュメントを自動生成します。
開発サーバーを起動後、以下のエンドポイントにアクセスすることで仕様を確認できます。

- **Swagger UI:** [`/ui`](http://localhost:8787/ui)
- **OpenAPI Spec (JSON):** [`/openapi`](http://localhost:8787/openapi)

## 利用可能なスクリプト

`packages/api/package.json`で定義されている主要なスクリプトは以下の通りです。

- `pnpm dev`: 開発サーバーを起動します (`wrangler dev`)。
- `pnpm deploy`: Cloudflare Workersにアプリケーションをデプロイします (`wrangler deploy --minify`)。
- `pnpm test`: `vitest`による単体テストを実行します。
