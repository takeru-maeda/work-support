# 仕事サポートアプリ（Work Support）

このリポジトリは、工数記録・目標管理・週報出力など日々の業務を支援する Web アプリケーションのモノレポです。`pnpm` ワークスペースを利用し、バックエンド（Cloudflare Workers + Hono）、フロントエンド（React + Vite）、共有ライブラリを単一リポジトリで管理します。

機能ごとの仕様書（`docs/specs/`）を現在の姿の正とし、改修のたびに「改修の記録」を作って人間が承認してから実装します。AI エージェント（Claude Code）向けの入口は `CLAUDE.md` です。

## パッケージ構成
```
/ (root)
├── packages/
│   ├── api/      # Cloudflare Workers (Hono) バックエンド
│   ├── web/      # React + Vite フロントエンド
│   └── shared/   # 共通の型・スキーマ・ユーティリティ
├── docs/         # 仕様書、規約（steering）、計画書など（索引: docs/README.md）
└── CHANGELOG.md  # 変更履歴
```

| パッケージ        | 役割                                                                                   | 詳細                                                 |
| ----------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/api`    | Cloudflare Workers + Hono のバックエンド。API と Supabase への永続化を担当します。     | `packages/api/README.md`、`packages/api/CLAUDE.md`   |
| `packages/web`    | React + Vite のフロントエンド。機能単位で UI・状態・API 呼び出しを分けています。       | `packages/web/README.md`、`packages/web/CLAUDE.md`   |
| `packages/shared` | API の入出力スキーマ（Zod）とユーティリティを共有し、型の整合性を保ちます。            | コードを参照                                         |

## ドキュメントの読み順

1. `CLAUDE.md` で全体の地図と開発の進め方を把握する
2. `docs/steering/`（product / tech / structure）で目的、技術、構成の規約を確認する
3. 対象の機能の仕様書 `docs/specs/<feature>/spec.md` を読む（一覧は `docs/specs/README.md`）
4. 改修するときは、`docs/specs/<feature>/changes/` に改修の記録を作って承認を得る

## デプロイ URL
- フロントエンド: https://work-support-app.com
- バックエンド (Cloudflare Workers): https://work-support-api.com
- API 仕様 (Swagger UI): https://work-support-api.com/ui

## セットアップ
1. ルートで依存関係をインストールします。
   ```bash
   pnpm install
   ```
2. バックエンド固有の環境変数や wrangler 設定は `packages/api/README.md` を参照してください。
3. フロントエンドの `.env` 設定や Vite 起動手順は `packages/web/README.md` を参照してください。
4. 開発サーバーの起動:
   ```bash
   pnpm dev:api   # Workers (wrangler dev)
   pnpm dev:web   # Vite
   ```

## テスト
- すべてのパッケージで Vitest を利用します（テスト基盤は整備中。方針は `docs/steering/testing.md`）。
- 仕様書の受け入れ基準（`AC-<feature>-NN`）をテストの単位にします。

## 開発指針
- 改修は「改修の記録の作成 → 承認 → 実装 → 検証 → 仕様書の更新」の流れで行います（`CLAUDE.md`）。
- TypeScript strict。型のみのインポートは `import type` を使用します。
- JSDoc は `docs/guides/jsdoc-guidelines.md` に従って記述します。
- バックエンドは機能単位の Vertical Slice、フロントエンドは Bulletproof React を下敷きにした機能単位の構成です（`docs/steering/structure.md`）。
- クライアント／サーバー共通のスキーマやロジックは `packages/shared` に集約します。
- 変更は `CHANGELOG.md` に記録します。
