# Technology Stack

## Architecture

pnpm ワークスペースによるモノレポ構成。バックエンドは Cloudflare Workers (Hono)、フロントエンドは React + Vite、共通スキーマは shared パッケージで管理。

- **Backend**: Vertical Slice（フィーチャーベース）アーキテクチャ
- **Frontend**: BalletProof（Bulletproof React ベース）構成

## Core Technologies

- **Language**: TypeScript (strict mode)
- **Backend**: Cloudflare Workers + Hono.js
- **Frontend**: React 19+ + Vite 7+
- **Runtime**: Node.js 20+ / Cloudflare Workers Runtime
- **Package Manager**: pnpm 10+

## Key Libraries

### Backend
- **Hono**: 軽量 Web フレームワーク
- **hono-openapi / Zod**: スキーマバリデーション・OpenAPI 自動生成
- **Supabase**: PostgreSQL + 認証

### Frontend
- **React**: UI ライブラリ
- **Zustand**: グローバル状態管理（認証・テーマ）
- **SWR**: サーバー状態キャッシュ
- **shadcn/ui + Radix UI**: UI コンポーネント
- **Tailwind CSS 4+**: スタイリング
- **Axios**: HTTP クライアント

### Shared
- **Zod**: スキーマ定義・バリデーション（フロント・バック共有）

## Development Standards

### Type Safety
- TypeScript strict mode 必須
- `any` 型の使用禁止
- 型専用インポートは `import type` を使用

### Code Quality
- ESLint + Prettier による一貫したフォーマット
- 文末セミコロン必須
- 敬体の JSDoc 記述（`@docs/guides/jsdoc-guidelines.md` 準拠）

### Testing
- Vitest でユニットテスト
- テストファイルは `*.test.ts(x)` に統一
- 主要フローのカバレッジを優先

## Development Environment

### Required Tools
- Node.js 20+
- pnpm 10+
- wrangler（Cloudflare CLI）

### Common Commands
```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev:api   # Workers (wrangler dev) - localhost:8787
pnpm dev:web   # Vite - localhost:5173

# テスト実行
pnpm --filter api test
pnpm --filter web test

# デプロイ
pnpm -F api run deploy    # Cloudflare Workers
# web は Vercel 自動デプロイ
```

## Key Technical Decisions

1. **仕様駆動開発**: `@docs/specs` を単一の参照源とし、ドキュメントと実装を同期
2. **型共有戦略**: `packages/shared` の Zod スキーマから型を生成し、API コントラクトを保証
3. **認証方式**: Supabase JWT 認証 + 外部連携用 API キー認証
4. **ホスティング**: バックエンドは Cloudflare Workers、フロントエンドは Vercel

---
_Document standards and patterns, not every dependency_
