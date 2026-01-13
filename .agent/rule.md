# Repository Guidelines

本ドキュメントは、本リポジトリで作業するコントリビューター向けの簡潔なガイドです（目標: 約300語以内）。作業開始時に必ず `AI_AGENT_GUIDE.md` と `@docs/` 配下の全ドキュメントを読み込み、規約と仕様を把握してください。回答は日本語で行ってください。

## プロジェクト構成
- ルート: pnpm モノレポ。コードは `packages/` 配下に集約。
- `packages/api`: Hono + Cloudflare Workers のバックエンド。機能ごとに `features/<feature>/{index,service,repository}.ts`。
- `packages/web`: Vite + React フロント。Balletproof への移行中。ページは `pages/`、機能別 UI/ロジックは `features/`。
- `packages/shared`: バックエンド/フロント共通の型・ユーティリティ。
- ドキュメント: `@docs/`（仕様・設計・ガイド）。

## 開発・ビルド・テスト
- 依存インストール: `pnpm install`（ルート）。
- 開発サーバー: `pnpm dev:api`（API）、`pnpm dev:web`（Web）。
- テスト: `pnpm test` または各パッケージで `pnpm vitest`。Vitest を使用。
- 型チェック/ビルドは各パッケージの `build`/`typecheck` スクリプトを利用（必要に応じて `pnpm --filter <pkg> <script>`）。

## コーディングスタイル & 命名
- 言語は TypeScript。**全てに型注釈**を付与し、文末セミコロン必須。
- 型専用 import は `import type { Foo } from "...";` を使用。
- エクスポートは原則名前付き。主役1つなら `export default` 可。
- ファイル命名: ユーティリティは `kebab-case.ts`、React コンポーネントは `PascalCase.tsx`、型専用は `xxx.types.ts`、フックは `useXxx.ts`。
- インポート順: 外部 → エイリアス → 相対。グループ間に空行。
- 実装後、対象関数に JSDoc を付与（1行目は敬体、@param/@returns を順序通り）。

## テスト指針
- テスト名/ファイル: `*.test.ts` / `*.test.tsx`（または `.spec`）。
- 仕様駆動開発: 実装前に `@docs/specs` を参照。追加機能は該当仕様とテストをセットで更新。
- Undo/Redo、ドラフト保存、API バリデーションなど副作用箇所はユースケース単位でテストを追加。

## コミット & PR
- コミットメッセージ: 簡潔に目的を述べる（例: `feat: add goals history filter`）。
- PR では以下を記載:
  - 目的と変更概要（箇条書き推奨）。
  - 影響範囲（API/DB/UI）。
  - テスト結果（実行コマンドと要約）。
  - UI変更がある場合はスクリーンショットや簡易動画。
- 仕様タスクを進めた場合は `@docs/specs/tasks/index.md` のチェックボックスを更新。

## セキュリティ & 環境変数
- 秘密情報はコードに含めない。Cloudflare Workers では Secrets、Vercel では環境変数設定を使用。フロントで公開する値は `VITE_` 接頭辞。
- GAS 連携用 API キーはバックエンドの環境変数で管理し、フロントには置かない。

## アーキテクチャ上の注意
- バックエンドは Vertical Slice。ビジネスロジックは `service`, DB I/O は `repository` に分離。
- フロントは SWR + axios、Zustand で状態管理。複合フックは関心ごとに分割し、モジュール化（詳細: `@docs/guides/hook-refactoring-guide.md`）。
