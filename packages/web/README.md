# Work Support Web

フロントエンドは React + Vite を基盤とした SPA として構築され、業務支援アプリ「仕事サポートアプリ」の UI レイヤーを担います。工数登録・目標管理・週報出力など、仕様は `AI_AGENT_GUIDE.md` と `@docs/specs` に定義されたドキュメントを参照して仕様駆動で実装します。

## 主な画面
- `/` ホーム：工数登録・目標管理・週報出力へのハブ。
- `/efforts` 工数一覧：登録済みの工数データを確認・管理。
- `/efforts/new` 工数登録：案件/タスク選択、見積・実績入力、ドラフト同期、完了メール設定を提供。
- `/goals` 目標管理：最新期間の目標編集、内容ダイアログ、削除確認、過去目標検索を実装。
- `/weekly-report` 週報出力：対象週の工数サマリー・ミッション・目標進捗を整形して表示。
- `/login` / `/signup` / `/reset-password` 認証関連：Supabase 認証フローを提供。
- `/profile` / `/settings`：プロフィール更新と通知設定の同期を扱う。

詳細な画面要件は `@docs/specs/design/03-frontend.md`、API 仕様は `@docs/specs/design/05-api.md` を参照してください。

## 技術スタック
- React + TypeScript + Vite
- Zustand（認証/テーマなど共有状態）、SWR（サーバー状態）
- shadcn/ui + Tailwind CSS（UI コンポーネント）
- Axios（API クライアント）
- Vitest（テスト）

API と型スキーマはバックエンド（Cloudflare Workers + Hono）および共有パッケージと連携します。

## ディレクトリ構成（BalletProof 設計）
```
packages/web/src/
├── app/           // エントリポイント、プロバイダ、ルーター
├── pages/         // ルート単位のページコンポーネント
├── features/      // 機能境界ごとの UI / hooks / services
├── components/    // 再利用可能な UI（layout/shared/ui）
├── hooks/         // 共通カスタムフック
├── lib/           // API クライアント、日付処理など共有ロジック
├── services/      // API 通信やストレージ I/O の抽象化
├── store/         // Zustand ストア
├── styles/        // Tailwind 設定とグローバル CSS
├── config/        // ルーティングや環境変数設定
└── types/         // 型定義（shared パッケージの zod スキーマを参照）
```

## セットアップ
1. ルートディレクトリで依存関係をインストールします。
   ```bash
   pnpm install
   ```
2. フロントエンド開発サーバーを起動します。
   ```bash
   pnpm dev:web
   ```
3. 環境変数は `VITE_` プレフィックスを付けて `packages/web/.env` などに設定してください。（例：`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`）

## 環境変数
`packages/web/.env`（または `.env.local`）に以下を設定してください。

| 変数名                   | 必須 | 説明                                                                       | 例                               |
| ------------------------ | ---- | -------------------------------------------------------------------------- | -------------------------------- |
| `VITE_SUPABASE_URL`      | 必須 | Supabase プロジェクトの URL。`https://<project>.supabase.co` 形式。        | `https://xyzcompany.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 必須 | Supabase の anon 公開キー。ブラウザから Supabase API を呼び出す際に使用。  | `eyJhbGciOi...`                  |
| `VITE_API_BASE_URL`      | 任意 | バックエンド API のベース URL。未設定時は `http://localhost:8787` を利用。 | `https://work-support-api.com`   |

> `.env` に記述した値は Vite のビルド時に注入されます。機密情報を Git 管理から除外するため、`.env` ファイルはコミットしないでください。

## API との連携
- 全 API は JWT 認証が必要です。Supabase のアクセストークンを `Authorization: Bearer <jwt>` で送信します。
- 工数・目標・週報などの API コントラクトは `@docs/specs/design/05-api.md` に定義されている OpenAPI 相当の仕様に従います。
- 共有の Zod スキーマ/型は `packages/shared` からインポートして、フロントとバックで型整合性を保ちます。

## 実装方針とガイドライン
- 仕様駆動開発や TypeScript/JSDoc ルールの共通方針はルート `README.md` と `AI_AGENT_GUIDE.md` を参照してください。
- フロントエンド固有の観点（例: `POST /api/logs/error` へのエラーレポートや API 並列取得のフロー）は `@docs/specs/design/03-frontend.md` で詳細を確認し、それに従って実装してください。

## テスト
- テストフレームワークは Vitest を使用します。ファイル名は `*.test.ts(x)` に統一し、仕様の主要分岐をカバーしてください。
- API モックやフックテストは `@testing-library/react` などを組み合わせて実施します。

## デプロイ
- `main` ブランチへのコミットが GitHub にプッシュされると、Vercel の自動デプロイが走ります。
- デプロイ状況は Vercel プロジェクトのダッシュボードで確認できます。ローカルでのビルド確認（`pnpm --filter web build`）を行ってから `main` にマージしてください。

## 状態管理 / 依存関係
- Zustand ストア:
  - `store/auth`: Supabase 由来のユーザー情報とトークンを保持し、API 呼び出しに利用します。
  - `store/theme`: テーマや UI プリファレンスを `persist` ミドルウェアで保存します。
  - `store/weeklyReport` など、機能別に小さなストアへ分割しています。
- SWR:
  - `lib/swrConfig.ts` で共通設定を定義し、`services/*` が提供する fetcher を利用してサーバー状態を取得します。

## 参考ドキュメント
- プロジェクト全体の概要：`AI_AGENT_GUIDE.md`
- 要件定義：`@docs/specs/requirements/index.md`
- 詳細設計インデックス：`@docs/specs/design/00-index.md`
- フロントエンド設計詳細：`@docs/specs/design/03-frontend.md`
- API 仕様：`@docs/specs/design/05-api.md`
- データ構造：`@docs/specs/design/06-data-structures.md`

ドキュメントと実装の差異が見つかった場合は、仕様を更新した上で README とコードを同期させてください。
