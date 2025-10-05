# システム全体像

## 技術スタック

| カテゴリ | 技術 | 備考 |
| :--- | :--- | :--- |
| 言語 | TypeScript | |
| バックエンド | Hono.js | Cloudflare Workersにデプロイ |
| フロントエンド | React (Vite) | Vercelにデプロイ |
| データベース | Supabase | |
| APIドキュメンテーション | hono-openapi | OpenAPI仕様の自動生成 |
| フォーム | Googleフォーム | Google Apps ScriptからHTTPリクエストを送信 |
| ルーティング | React Router | |
| スキーマバリデーション | Zod | |
| UIコンポーネント | shadcn/ui | |
| 状態管理 | zustand | UI状態 |
| データ取得 | SWR | サーバー状態 |
| CSSフレームワーク | Tailwind CSS | |
| HTTPクライアント | axios | SWRのfetcherとして利用 |

## モノレポ構成

本プロジェクトは、バックエンド、フロントエンド、共有コードを単一のリポジトリで管理するモノレポ構成を採用する。`pnpm` の `workspaces` 機能の利用を想定している。

```
/
├── @docs/
├── packages/
│   ├── api/          # バックエンド (Hono.js)
│   ├── web/          # フロントエンド (React + Vite)
│   └── shared/       # 共有コード (型定義など)
├── .gitignore
├── package.json      # モノレポ全体を管理
└── tsconfig.base.json # 共有TypeScript設定
```

