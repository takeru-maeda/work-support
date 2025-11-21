# 仕事サポートアプリ（Work Support）

このリポジトリは、工数記録・目標管理・週報出力など日々の業務を支援する Web アプリケーションのモノレポです。`pnpm` ワークスペースを利用し、バックエンド（Cloudflare Workers + Hono）、フロントエンド（React + Vite）、共有ライブラリを単一リポジトリで管理します。仕様は `@docs/specs` に集約されており、仕様駆動開発を前提に進めます。AI エージェント向けの概要は `AI_AGENT_GUIDE.md` を参照してください。

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

### パッケージ役割サマリ

| パッケージ | 役割 | 詳細 README |
| --- | --- | --- |
| `packages/api` | Cloudflare Workers + Hono のバックエンド実装。API 仕様と Supabase 永続化を担当します。 | `packages/api/README.md` |
| `packages/web` | React + Vite のフロントエンド実装。BalletProof 構成で UI/状態管理/サービスを分離しています。 | `packages/web/README.md` |
| `packages/shared` | API スキーマやユーティリティを共有し、型整合性を保つためのパッケージです。 | 該当モジュールをコード参照 |

## ドキュメントの読み順

1. `AI_AGENT_GUIDE.md` でプロジェクトの目的と開発ルールを把握する。
2. `@docs/specs/requirements/index.md` で要件を確認する。
3. `@docs/specs/design/00-index.md` から設計各論（`01-system-overview.md` 〜 `09-database.md`）を順番にたどる。
4. 実装対象タスクを `@docs/specs/tasks/index.md` で確認し、進捗を更新する。

## デプロイ URL
- フロントエンド (Vercel): https://work-support-web.vercel.app
- バックエンド (Cloudflare Workers): https://work-support.noreply-work-s-dev.workers.dev/
- API 仕様 (Swagger UI): https://work-support.noreply-work-s-dev.workers.dev/ui

## セットアップ
1. ルートで依存関係をインストールします。
   ```bash
   pnpm install
   ```
2. バックエンド固有の環境変数や wrangler 設定は `packages/api/README.md` を参照してください。
3. フロントエンドの `.env` 設定や Vite 起動手順は `packages/web/README.md` を参照してください。
4. 共通の開発サーバー起動コマンド例:
   ```bash
   pnpm dev:api   # Workers (wrangler dev)
   pnpm dev:web   # Vite
   ```

## テスト
- すべてのパッケージで Vitest を利用します。実行方法やカバレッジ方針は各 README を参照してください。
  ```bash
  pnpm --filter api test
  pnpm --filter web test
  ```
- 仕様に紐づく重要フロー（工数ドラフト制御、目標計算、週報生成など）をユニットテストでカバーする点は共通です。

## 開発指針
- 仕様駆動開発：実装前に `@docs/specs` を確認し、タスク完了時は `@docs/specs/tasks/index.md` を更新します。
- TypeScript ルール：全ての変数・関数に型注釈を付与し、文末にセミコロンを記述します。型のみのインポートは `import type` を使用します。
- JSDoc：敬体の概要行と必要なタグを `@docs/guides/jsdoc-guidelines.md` に従って記述します。
- バックエンドはフィーチャーベースの Vertical Slice アーキテクチャ、フロントエンドは BalletProof（Bulletproof React ベース）の構成に倣って実装します。
- クライアント／サーバー共通のスキーマやロジックは `packages/shared` に集約し、型整合性を保ちます。

## 主要ドキュメント
- プロジェクト概要 / AI エージェント向けガイド: `AI_AGENT_GUIDE.md`
- 要件定義: `@docs/specs/requirements/index.md`
- 詳細設計インデックス: `@docs/specs/design/00-index.md`
- バックエンド設計: `@docs/specs/design/02-backend.md`
- フロントエンド設計: `@docs/specs/design/03-frontend.md`
- API 仕様: `@docs/specs/design/05-api.md`
- データ構造・DB 設計: `@docs/specs/design/06-data-structures.md`, `@docs/specs/design/09-database.md`

ドキュメントと実装に差異が発生した場合は、仕様書・タスクリスト・README を同時に更新し、常に最新の状態を維持してください。
