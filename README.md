# 仕事サポートアプリ（Work Support）

このリポジトリは、工数記録・目標管理・週報出力など日々の業務を支援する Web アプリケーションのモノレポです。`pnpm` ワークスペースを利用し、バックエンド（Cloudflare Workers + Hono）、フロントエンド（React + Vite）、共有ライブラリを単一リポジトリで管理します。仕様は `@docs/specs` に集約されており、仕様駆動開発を前提に進めます。

## パッケージ構成
```
/ (root)
├── packages/
│   ├── api/      # Cloudflare Workers (Hono) バックエンド
│   ├── web/      # React + Vite フロントエンド
│   └── shared/   # 共通の型・ユーティリティ
└── @docs/        # 仕様・設計ドキュメント群
```

各パッケージの詳細は `packages/api/README.md` と `packages/web/README.md` を参照してください。

## セットアップ
1. ルートディレクトリで依存関係をインストールします。
   ```bash
   pnpm install
   ```
2. バックエンド開発用の環境変数を `packages/api/.dev.vars` に定義します。
   ```
   SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   API_KEY=<fixed_api_key_for_gas>
   RESEND_API_KEY=<email_provider_key>
   APP_EMAIL=<sender_email>
   PROD_FRONTEND_URL=<https://your-frontend.vercel.app>
   DEV_FRONTEND_URL=http://localhost:5173
   ```
3. フロントエンド用に `packages/web/.env` を作成し、`VITE_SUPABASE_URL` など `VITE_` プレフィックス付きの変数を設定します。
4. 開発サーバーを並行して起動します。
   ```bash
   pnpm dev:api   # Cloudflare Workers (wrangler dev)
   pnpm dev:web   # Vite 開発サーバー
   ```

## テスト
- バックエンド・フロントエンドともに Vitest を利用します。
  ```bash
  pnpm --filter api test
  pnpm --filter web test
  ```
- 仕様の主要フロー（工数ドラフト同時実行制御、目標集計、週報生成など）をユニットテストでカバーしてください。

## 開発指針
- 仕様駆動開発：実装前に `@docs/specs` を確認し、タスク完了時は `@docs/specs/tasks.md` を更新します。
- TypeScript ルール：全ての変数・関数に型注釈を付与し、文末にセミコロンを記述します。型のみのインポートは `import type` を使用します。
- JSDoc：敬体の概要行と必要なタグを `@docs/guides/jsdoc-guidelines.md` に従って記述します。
- バックエンドはフィーチャーベースの Vertical Slice アーキテクチャ、フロントエンドは BalletProof（Bulletproof React ベース）の構成に倣って実装します。
- クライアント／サーバー共通のスキーマやロジックは `packages/shared` に集約し、型整合性を保ちます。

## 主要ドキュメント
- プロジェクト概要: `GEMINI.md`
- 要件定義: `@docs/specs/requirements.md`
- 詳細設計インデックス: `@docs/specs/design/00-index.md`
- バックエンド設計: `@docs/specs/design/02-backend.md`
- フロントエンド設計: `@docs/specs/design/03-frontend.md`
- API 仕様: `@docs/specs/design/05-api.md`
- データ構造・DB 設計: `@docs/specs/design/06-data-structures.md`, `@docs/specs/design/09-database.md`

ドキュメントと実装に差異が発生した場合は、仕様書・タスクリスト・README を同時に更新し、常に最新の状態を維持してください。
