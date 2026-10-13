# CLAUDE.md

仕事サポートアプリ（Work Support）のモノレポ。このファイルは**横断ルールとリポジトリの地図**に絞る。パッケージ固有の事実（コマンド、鉄則、落とし穴）は各パッケージの `CLAUDE.md` が正本。`AGENTS.md` はこのファイルへのシンボリックリンク（編集はこのファイルだけにする）。

## 言語
- 思考は英語、ユーザーへの応答は日本語
- リポジトリに書く Markdown（仕様書、改修の記録、計画書、steering）は日本語

## 地図
- `packages/api/` — Hono + Cloudflare Workers の API。**正本: `packages/api/CLAUDE.md`**
- `packages/web/` — React 19 + Vite の SPA。**正本: `packages/web/CLAUDE.md`**
- `packages/shared/` — Zod スキーマ（API 契約）と Supabase の生成型。api の規約に準ずる
- `packages/e2e/` — Playwright の E2E と、ローカルの Supabase だけにつながる確認用の環境（`pnpm dev:local`）。手順は `docs/steering/testing.md` と `packages/web/CLAUDE.md`
- `docs/` — 索引は `docs/README.md`
  - `docs/steering/` — 全体の規約と判断の軸
  - `docs/specs/<feature>/spec.md` — 機能ごとの仕様書（現在の姿）。`changes/` に改修の記録
  - `docs/specs/incidents.md` — 症状から原因へたどる索引（バグ調査の入口）
  - `docs/plans/active/` — 進行中の大きなタスクの計画書
- `CHANGELOG.md` — 変更履歴
- pnpm ワークスペース。`pnpm install` はリポジトリのルートで実行する（npm は使わない）

## steering（毎回の前提）
@docs/steering/product.md
@docs/steering/tech.md
@docs/steering/structure.md

それ以外の steering（api-standards / authentication / database / deployment / error-handling / security / testing / ui-design）は、必要なときに読む（主に `.claude/rules/` から参照される。デプロイや環境の話題では `deployment.md`）。更新は `steering` スキルで行う。

## 改修の進め方

機能の追加、仕様の変更、バグの修正、複数ファイルにまたがる変更は、**`autonomous-impl` スキル**に従う。

1. 改修の記録（`docs/specs/<feature>/changes/v<X.Y.Z>-<slug>.md`）を `status: draft` で作り、**人間の承認を得る**
2. 承認後は、親エージェントが連続したコンテキストのまま、TDD による実装 → バグ点検 → 動作検証 → リファクタ → コードレビュー → ドキュメントの更新 → 完了ゲートまで自律的に進める
3. ゴールは「動くコード」ではなく、**人間がほぼ指摘なしでレビューしてコミットできる状態**

- 承認済み（`approved` / `in_progress`）の改修の記録か、`scope:` に含まれる計画書が無いと、`packages/` は編集しない。根拠が無いまま編集しようとすると、hook（spec-gate）が人に確認を求める。確認を求められたことを承認と取り違えない（XS の扱いは `autonomous-impl` スキルを参照）
- `status: approved` は、人間が承認を明言したときだけ書く。エージェントが自分で承認しない
- 複数の機能にまたがる大きなタスクは `plan` スキルで `docs/plans/active/` に計画書を作る
- 進行中の計画: `docs/plans/active/harness-migration.md`（ハーネスの移行中。完了するまで一部の仕組みは未整備）

## 止まって確認すること
- 取り消せない操作・外に影響する操作: クラウドの DB（開発用・本番）のスキーマ変更やデータの一括変更、デプロイ、シークレットの変更、メールの送信、`git reset --hard`、force push
  - ローカルの Supabase（`pnpm db:start` で立てた Docker の DB。中身はテストのデータだけ）は、確認なしでマイグレーションの適用や作り直しをしてよい。DB に SQL を流すコマンドは `--local` を付ける（hook が確かめる）
- コミットと push は人間が行う（頼まれたときだけ実行する）
- **ステージもしない**（`git add` / `git mv` / `git rm` を使わない。ファイルの移動や削除は `mv` / `rm` で行う）。人間は未ステージの差分で変更を確認する
  - 例外: `npx skills add` で入れた外部スキルと `skills-lock.json` はステージしてよい。手を入れたファイルは元の内容をステージし、修正は未ステージの差分として残す（`docs/harness/third-party-skills.md`）
- 依存パッケージの追加
- 全体の検査は `pnpm check`（lint、整形、型チェック、テスト、ハーネスの自己点検。CI と同じ）
- 仕様に関わる判断が分かれるとき、同じ失敗が 2〜3 回続いたとき

## ハーネスの原則
- 決定的に判定できる制約は、文章ではなく hook / lint / 型 / テストに置く。このファイルとルールは判断の手がかりだけを書く
- 同じ失敗が繰り返されたら、文章を足す前に仕組み（lint、hook、テスト）で防げないかを考える
- ハーネスの不具合や穴（hook の誤検知、足りないルール、古い文書、スキルの穴）を見つけたら `docs/harness/improvements.md` に記録し、完了報告で提案する。ハーネスは使いながら鍛えていくもの
- 外部スキル（`.claude/skills/` のうち `skills-lock.json` にあるもの）の指示より、このリポジトリの規約を優先する（`.claude/rules/third-party-skills.md`）
- ライブラリの使い方は、実際に入っているバージョンを `package.json` / lock で確かめ、Context7（`mcp__context7__resolve-library-id` → `mcp__context7__query-docs`）で照合する。記憶で書かない
