# デプロイ

> **エージェントはデプロイ、シークレットの変更、本番の設定変更を行わない**（`.claude/settings.json` で禁止している）。この文書は仕組みを理解するためのもの。

## 環境

| 環境 | バックエンド | フロントエンド |
| --- | --- | --- |
| 開発 | `wrangler dev`（localhost:8787） | `vite`（localhost:5173） |
| 本番 | Cloudflare Workers | Vercel |

テスト用の Supabase は本番とは別のプロジェクトを使う（ハーネス移行計画の P3 で整備）。

## バックエンド

- デプロイ: `pnpm -F api run deploy`（`wrangler deploy --minify`）。人間が実行する
- 設定: `packages/api/wrangler.jsonc`
- シークレット: 本番は Cloudflare のシークレット、ローカルは `packages/api/.dev.vars`（git には入れない。項目は `.dev.vars.example`）

## フロントエンド

- Vercel が `main` ブランチへの push で自動デプロイする
- ビルド: `pnpm --filter web build`
- SPA のため `packages/web/vercel.json` で全パスを `index.html` に書き換えている

## URL

- フロントエンド: `https://work-support-app.com`
- バックエンド: `https://work-support-api.com`（Swagger UI は `/ui`）

## バージョン

- アプリのバージョンは SemVer で、全パッケージの `package.json` をそろえて上げる（`docs/guides/versioning.md`）
- 改修の記録（`docs/specs/<feature>/changes/v<X.Y.Z>-<slug>.md`）と `CHANGELOG.md` のバージョンを一致させる

---
_パターンと判断を書く_
