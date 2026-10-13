# 技術スタック

## アーキテクチャ

pnpm ワークスペースのモノレポ。バックエンドは Cloudflare Workers 上の Hono、フロントエンドは React + Vite の SPA、共有スキーマは `packages/shared`。

- **バックエンド**: Vertical Slice（機能単位）構成
- **フロントエンド**: Bulletproof React を下敷きにした機能単位の構成（移行途中。詳しくは `structure.md`）

## 主な技術

- **言語**: TypeScript（strict）
- **バックエンド**: Cloudflare Workers + Hono 4
- **フロントエンド**: React 19 + Vite 7 + React Router 6（SPA。SSR / RSC は使わない）
- **DB / 認証**: Supabase（PostgreSQL、Auth）
- **パッケージ管理**: pnpm 10（npm は使わない）。複数のパッケージで使う依存のバージョンは `pnpm-workspace.yaml` の catalog でそろえ、各 `package.json` からは `"catalog:"` で参照する。各パッケージは自分の `package.json` に書いた依存だけを import する（lint で検出）

正確なバージョンは各 `package.json` と `pnpm-lock.yaml` を正とする。ライブラリの使い方は、実際に入っているバージョンに合わせて Context7（`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`）で確かめる。

## 主なライブラリ

### バックエンド（`packages/api`）
- **Hono**: Web フレームワーク
- **hono-openapi + Zod**: 入力の検証と OpenAPI の自動生成
- **@supabase/supabase-js**: DB アクセス（service role キーで接続）
- **jose**: Supabase JWT の検証
- **メール送信**: GAS のエンドポイント（`GAS_EMAIL_ENDPOINT`）へ fetch で依頼する（`src/lib/mailer.ts`）。メール送信のライブラリは使わない

### フロントエンド（`packages/web`）
- **shadcn/ui（radix, new-york）+ Radix UI + Tailwind CSS 4**: UI とスタイル
- **SWR + axios**: サーバー状態の取得とキャッシュ
- **Zustand**: クライアントのグローバル状態（ユーザー、設定、テーマ）
- **react-hook-form + Zod**: フォーム
- **immer**: 工数登録の undo / redo
- **dnd-kit / recharts / sonner**: 並べ替え、グラフ、トースト

### 共有（`packages/shared`）
- **Zod**: API の入出力スキーマ（フロントエンドとバックエンドで共有）
- **Supabase の生成型**: `src/types/db.ts`（`supabase-gen-types.sh` で生成）

## 開発の基準

### 型
- TypeScript strict。`any` は使わない
- 型だけを import するときは `import type` を使う

### コードの品質
- ESLint + Prettier（ダブルクォート、セミコロンあり）。ESLint の設定はルートの `eslint.config.js` 1 つ。整形は Prettier が担い、ESLint では見ない
- 関数や公開 API には JSDoc を書く（`docs/guides/jsdoc-guidelines.md`）
- コメントは「なぜ」を書き、コードの言い換えは書かない

### テスト
- Vitest。ファイル名は `*.test.ts(x)`、テスト対象と同じ階層に置く
- 詳しくは `testing.md`

## 開発環境

```bash
pnpm install          # 依存のインストール（リポジトリのルートで）
pnpm dev:api          # API（wrangler dev, localhost:8787）
pnpm dev:web          # Web（Vite, localhost:5173）
```

パッケージ固有のコマンドと守るべき手順は、各パッケージの `CLAUDE.md` を正とする。

## 主な技術判断

1. **仕様書が正**: 機能ごとの仕様書（`docs/specs/`）を現在の姿の正とし、改修のたびに更新する
2. **型共有**: API の入出力は `packages/shared` の Zod スキーマで定義し、両側で使う
3. **認証方式**: Web からは Supabase JWT、外部連携（GAS）からは API キー
4. **ホスティング**: API は Cloudflare Workers、Web は Vercel

---
_依存の一覧ではなく、判断の軸と基準を書く_
